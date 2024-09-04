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
import { NaeuralOptions, Naeural, NaeuralEvent } from '@naeural/jsclient';
import {NAEURAL_MODULE_OPTIONS, DEFAULT_CLIENT_NAME, NAEURAL_MODULE_ID} from './naeural.constants.js';
import {
    NaeuralClientFactory,
    NaeuralModuleAsyncOptions,
    NaeuralModuleOptions,
    NaeuralOptionsFactory,
} from './interfaces/naeural.module.interfaces.js';
import { defer, lastValueFrom } from 'rxjs';
import { NaeuralService } from './services/naeural.service.js';
import { MetadataExplorerService } from './services/metadata.explorer.service.js';
import { MetadataScanner } from '@nestjs/core/metadata-scanner.js';
import { v4 as uuid } from 'uuid';

@Global()
@Module({
    providers: [NaeuralService, MetadataExplorerService, MetadataScanner],
})
export class NaeuralModule implements OnApplicationShutdown, OnApplicationBootstrap {
    private static readonly logger = new Logger('NaeuralModule');

    constructor(
        private readonly networkService: NaeuralService,
        private readonly moduleRef: ModuleRef,
    ) {}

    onApplicationBootstrap(): any {
        this.networkService.subscribe();
    }

    static register(options: NaeuralModuleOptions): DynamicModule {
        const naeuralModuleOptions = {
            provide: NAEURAL_MODULE_OPTIONS,
            useValue: options,
        };

        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async () => await this.createNetworkClientFactory(options),
        };

        const providers = [networkClientProvider, naeuralModuleOptions];
        const exports = [networkClientProvider];

        return {
            module: NaeuralModule,
            providers,
            exports,
        };
    }

    static registerAsync(options: NaeuralModuleAsyncOptions): DynamicModule {
        const networkClientProvider = {
            provide: DEFAULT_CLIENT_NAME,
            useFactory: async (naeuralOptions: NaeuralModuleOptions) => {
                if (options.name) {
                    return await this.createNetworkClientFactory(
                        {
                            ...naeuralOptions,
                        },
                        options.clientFactory,
                    );
                }

                return await this.createNetworkClientFactory(naeuralOptions, options.clientFactory);
            },
            inject: [NAEURAL_MODULE_OPTIONS],
        };

        const asyncProviders = this.createAsyncProviders(options);
        const providers = [
            ...asyncProviders,
            networkClientProvider,
            {
                provide: NAEURAL_MODULE_ID,
                useValue: uuid(),
            },
            ...(options.extraProviders || []),
        ];
        // eslint-disable-next-line @typescript-eslint/ban-types
        const exports: Array<Provider | Function> = [networkClientProvider];

        return {
            module: NaeuralModule,
            imports: options.imports,
            providers,
            exports,
        };
    }

    async onApplicationShutdown(): Promise<any> {
        const client = this.moduleRef.get<Naeural>(DEFAULT_CLIENT_NAME);
        try {
            if (client) {
                // @ts-ignore
                await client.shutdown();
            }
        } catch (e) {
            NaeuralModule.logger.error(e?.message);
        }
    }

    private static createAsyncProviders(options: NaeuralModuleAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        const useClass = options.useClass as Type<NaeuralOptionsFactory>;
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: useClass,
                useClass,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: NaeuralModuleAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: NAEURAL_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }

        const inject = [(options.useClass || options.useExisting) as Type<NaeuralOptionsFactory>];

        return {
            provide: NAEURAL_MODULE_OPTIONS,
            useFactory: async (optionsFactory: NaeuralOptionsFactory) =>
                await optionsFactory.createNaeuralOptions(options.name), // TODO: implement this and test
            inject,
        };
    }

    private static async createNetworkClientFactory(options: NaeuralModuleOptions, clientFactory?: NaeuralClientFactory) {
        const createNaeuralClient =
            clientFactory ??
            ((options: NaeuralModuleOptions) => {
                const client = new Naeural(options as NaeuralOptions, this.logger);
                client.boot();

                this.attachLifecycleCallbacks(client);

                return client;
            });

        return await lastValueFrom(
            defer(async () => {
                return createNaeuralClient(options as NaeuralOptions);
            }),
        );
    }

    private static attachLifecycleCallbacks(client: Naeural) {
        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_CLIENT_CONNECTED, (data) => {
            this.logger.log(`Succesfully connected to upstream: ${data.upstream}`);
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_CLIENT_BOOTED, () => {
            this.logger.log('NaeuralEdgeProtocol Network client successfully booted.');
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_CLIENT_SHUTDOWN, () => {
            this.logger.log('NaeuralEdgeProtocol Network client successfully shutdown.');
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_ENGINE_OFFLINE, (data) => {
            this.logger.warn(`Edge Node OFFLINE: ${data.node} (${data.address})`);
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_ENGINE_REGISTERED, (status) => {
            this.logger.log(`Successfully REGISTERED new Edge Node: ${status.node} (${status.address})`);
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_ENGINE_DEREGISTERED, (status) => {
            this.logger.log(`Successfully DEREGISTERED Edge Node: ${status.node} (${status.address})`);
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_BC_ADDRESS, (message) => {
            this.logger.log(`NaeuralEdgeProtocol Blockchain Address: ${message.address}`);
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_CLIENT_SYS_TOPIC_SUBSCRIBE, (err, data) => {
            if (err) {
                this.logger.error(err.message, JSON.stringify(err));

                return;
            }

            this.logger.log(
                `Successfully subscribed to network topic "${data.topic}" for "${data.event}" network events.`,
            );
        });

        // @ts-ignore
        client.on(NaeuralEvent.NAEURAL_CLIENT_SYS_TOPIC_UNSUBSCRIBE, (err, data) => {
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
