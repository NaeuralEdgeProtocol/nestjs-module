import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { ZxAIClient, ZxAIClientOptions } from '@naeural/jsclient';

export type ZxAIClientFactory = (options?: ZxAIClientOptions) => Promise<ZxAIClient>;

export type ZxAIModuleOptions = ZxAIClientOptions;

export interface ZxAIOptionsFactory {
    createZxAIOptions( // TODO: implement this.
        initiator?: string,
    ): Promise<ZxAIClientOptions> | ZxAIClientOptions;
}

export interface ZxAIModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    name?: string;
    useExisting?: Type<ZxAIOptionsFactory>;
    useClass?: Type<ZxAIOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<ZxAIModuleOptions> | ZxAIModuleOptions;
    clientFactory?: ZxAIClientFactory;
    inject?: any[];
    extraProviders?: Provider[];
}
