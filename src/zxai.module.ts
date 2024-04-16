import {
    DynamicModule,
    Global,
    Logger,
    Module,
    OnApplicationBootstrap,
    OnApplicationShutdown,
    Provider,
    Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ZxAIClientOptions, ZxAIClient, ZxAIClientEvent } from '@naeural/jsclient';
import { ZxAI_MODULE_OPTIONS, DEFAULT_CLIENT_NAME } from './zxai.constants.js';
import {
    ZxAIClientFactory,
    ZxAIModuleAsyncOptions,
    ZxAIModuleOptions,
    ZxAIOptionsFactory,
} from './interfaces/zxai.module.interfaces.js';
import { defer, lastValueFrom } from 'rxjs';
import { ZxAIService } from './services/zxai.service.js';
import { MetadataExplorerService } from './services/metadata.explorer.service.js';
import { MetadataScanner } from '@nestjs/core/metadata-scanner.js';
import { v4 as uuid } from 'uuid';

@Global()
@Module({
    providers: [ZxAIService, MetadataExplorerService, MetadataScanner],
})
export class ZxAIModule implements OnApplicationShutdown, OnApplicationBootstrap {
    private static readonly logger = new Logger('ZxAIModule');

    constructor(
        private readonly networkService: ZxAIService,
        private readonly moduleRef: ModuleRef,
    ) {}

    onApplicationBootstrap(): any {
        this.networkService.subscribe();
    }

    static register(options: ZxAIModuleOptions): DynamicModule {
        const zxaiModuleOptions = {
            provide: ZxAI_MODULE_OPTIONS,
            useValue: options,
        };

        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async () => await this.createNetworkClientFactory(options),
        };

        const providers = [networkClientProvider, zxaiModuleOptions];
        const exports = [networkClientProvider];

        return {
            module: ZxAIModule,
            providers,
            exports,
        };
    }

    static registerAsync(options: ZxAIModuleAsyncOptions): DynamicModule {
        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async (zxaiOptions: ZxAIModuleOptions) => {
                if (options.name) {
                    return await this.createNetworkClientFactory(
                        {
                            ...zxaiOptions,
                        },
                        options.clientFactory,
                    );
                }

                return await this.createNetworkClientFactory(zxaiOptions, options.clientFactory);
            },
            inject: [ZxAI_MODULE_OPTIONS],
        };

        const asyncProviders = this.createAsyncProviders(options);
        const providers = [
            ...asyncProviders,
            networkClientProvider,
            {
                provide: ZxAI_MODULE_OPTIONS,
                useValue: uuid(),
            },
            ...(options.extraProviders || []),
        ];
        // eslint-disable-next-line @typescript-eslint/ban-types
        const exports: Array<Provider | Function> = [networkClientProvider];

        return {
            module: ZxAIModule,
            imports: options.imports,
            providers,
            exports,
        };
    }

    async onApplicationShutdown(): Promise<any> {
        const client = this.moduleRef.get<ZxAIClient>(DEFAULT_CLIENT_NAME);
        try {
            if (client) {
                await client.shutdown();
            }
        } catch (e) {
            ZxAIModule.logger.error(e?.message);
        }
    }

    private static createAsyncProviders(options: ZxAIModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        const useClass = options.useClass as Type<ZxAIOptionsFactory>;
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: useClass,
                useClass,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: ZxAIModuleAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: ZxAI_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        const inject = [(options.useClass || options.useExisting) as Type<ZxAIOptionsFactory>];

        return {
            provide: ZxAI_MODULE_OPTIONS,
            useFactory: async (optionsFactory: ZxAIOptionsFactory) =>
                await optionsFactory.createZxAIOptions(options.name), // TODO: implement this and test
            inject,
        };
    }

    private static async createNetworkClientFactory(options: ZxAIModuleOptions, clientFactory?: ZxAIClientFactory) {
        const createZxAIClient =
            clientFactory ??
            ((options: ZxAIModuleOptions) => {
                const client = new ZxAIClient(options as ZxAIClientOptions, this.logger);
                client.boot();

                this.attachLifecycleCallbacks(client);

                return client;
            });

        return await lastValueFrom(
            defer(async () => {
                return createZxAIClient(options as ZxAIClientOptions);
            }),
        );
    }

    private static attachLifecycleCallbacks(client: ZxAIClient) {
        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_CLIENT_CONNECTED, (data) => {
            this.logger.log(`Succesfully connected to upstream: ${data.upstream}`);
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_CLIENT_BOOTED, () => {
            this.logger.log('NaeuralEdgeProtocol Network client successfully booted.');
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_CLIENT_SHUTDOWN, () => {
            this.logger.log('NaeuralEdgeProtocol Network client successfully shutdown.');
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_ENGINE_OFFLINE, (data) => {
            this.logger.warn(`Execution Engine OFFLINE: ${data.executionEngine}`);
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_ENGINE_REGISTERED, (status) => {
            this.logger.log(`Successfully REGISTERED new Execution Engine: ${status.executionEngine}`);
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_ENGINE_DEREGISTERED, (status) => {
            this.logger.log(`Successfully DEREGISTERED Execution Engine: ${status.executionEngine}`);
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_BC_ADDRESS, (message) => {
            this.logger.log(`NaeuralEdgeProtocol Blockchain Address: ${message.address}`);
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_CLIENT_SYS_TOPIC_SUBSCRIBE, (err, data) => {
            if (err) {
                this.logger.error(err.message, JSON.stringify(err));

                return;
            }

            this.logger.log(
                `Successfully subscribed to network topic "${data.topic}" for "${data.event}" network events.`,
            );
        });

        // @ts-ignore
        client.on(ZxAIClientEvent.ZxAI_CLIENT_SYS_TOPIC_UNSUBSCRIBE, (err, data) => {
            if (err) {
                this.logger.error(err.message, JSON.stringify(err));

                return;
            }

            this.logger.log(
                `Successfully unsubscribed from network topic "${data.topic}" for "${data.event}" network events.`,
            );
        });
    }
}
