import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { Naeural, NaeuralOptions } from '@naeural/jsclient';

export type NaeuralClientFactory = (options?: NaeuralOptions) => Promise<Naeural>;

export type NaeuralModuleOptions = NaeuralOptions;

export interface NaeuralOptionsFactory {
    createNaeuralOptions( // TODO: implement this.
        initiator?: string,
    ): Promise<NaeuralOptions> | NaeuralOptions;
}

export interface NaeuralModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    name?: string;
    useExisting?: Type<NaeuralOptionsFactory>;
    useClass?: Type<NaeuralOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<NaeuralModuleOptions> | NaeuralModuleOptions;
    clientFactory?: NaeuralClientFactory;
    inject?: any[];
    extraProviders?: Provider[];
}
