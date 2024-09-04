import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { Module } from '@nestjs/core/injector/module.js';
import { ModulesContainer } from '@nestjs/core/injector/modules-container.js';
import { MetadataScanner } from '@nestjs/core/metadata-scanner.js';
import {
    NAEURAL_GATEWAY_METADATA,
    CLIENT_EVENT_MAPPING_METADATA,
    CLIENT_EVENT_SUBSCRIPTION_METADATA,
    NETWORK_CLIENT_METADATA,
    PAYLOAD_MAPPING_METADATA,
    PAYLOAD_SUBSCRIPTION_METADATA,
    STREAM_MAPPING_METADATA,
    STREAM_SUBSCRIPTION_METADATA,
} from '../naeural.constants.js';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils.js';
import { NaeuralNetworkGateway } from '../interfaces/naeural.network.gateway.js';
import { MappingType, MessageMappingProperties } from '../interfaces/message.mapping.properties.js';
import { IsObject } from '../utils.js';

@Injectable()
export class MetadataExplorerService {
    constructor(
        private readonly modulesContainer: ModulesContainer,
        private readonly metadataScanner: MetadataScanner,
    ) {}

    extractRequireClients() {
        const modules = [...this.modulesContainer.values()];
        return this.flatMap(modules, (instance) => {
            return this.filterRequiresClient(instance);
        });
    }

    extractGateways() {
        const modules = [...this.modulesContainer.values()];
        return this.flatMap(modules, (instance) => this.filterProvider(instance, NAEURAL_GATEWAY_METADATA));
    }

    exploreGateway(gateway: NaeuralNetworkGateway): MessageMappingProperties[] {
        const instancePrototype = Object.getPrototypeOf(gateway);

        return this.metadataScanner
            .getAllMethodNames(instancePrototype)
            .map((method) => this.exploreMethodMetadata(instancePrototype, method))
            .filter((metadata) => metadata);
    }

    public exploreMethodMetadata(instancePrototype: object, methodName: string): MessageMappingProperties {
        const callback = instancePrototype[methodName];
        const isPayloadMapping = Reflect.getMetadata(PAYLOAD_MAPPING_METADATA, callback);
        const isNetworkStreamMapping = Reflect.getMetadata(STREAM_MAPPING_METADATA, callback);
        const isClientEventMapping = Reflect.getMetadata(CLIENT_EVENT_MAPPING_METADATA, callback);

        if (isUndefined(isPayloadMapping) && isUndefined(isNetworkStreamMapping) && isUndefined(isClientEventMapping)) {
            return null;
        }

        const signature = Reflect.getMetadata(PAYLOAD_SUBSCRIPTION_METADATA, callback);
        const stream = Reflect.getMetadata(STREAM_SUBSCRIPTION_METADATA, callback);
        const event = Reflect.getMetadata(CLIENT_EVENT_SUBSCRIPTION_METADATA, callback);
        const paramOrder = {
            error: null,
            payload: null,
            context: null,
        };

        if (signature) {
            const params = Reflect.getMetadata('design:paramtypes', instancePrototype, methodName);

            for (let i = 0; i < params.length; i++) {
                const paramType = Reflect.getMetadata(`params:${methodName}:${i}`, instancePrototype);
                paramOrder[paramType] = i;
            }
        }

        let type = MappingType.UNKNOWN;
        let path = null;

        switch (true) {
            case isPayloadMapping:
                path = signature;
                type = MappingType.PAYLOAD;
                break;
            case isNetworkStreamMapping:
                path = stream;
                type = MappingType.STREAM;
                break;
            case isClientEventMapping:
                path = event;
                type = MappingType.CLIENT_EVENT;
                break;
        }

        return {
            type,
            callback,
            path,
            methodName,
            paramOrder,
        };
    }

    public *scanForClientHooks(instance: any): IterableIterator<string> {
        if (!IsObject(instance)) {
            return;
        }
        for (const propertyKey in instance) {
            if (isFunction(propertyKey)) {
                continue;
            }
            const property = String(propertyKey);
            const isServer = Reflect.getMetadata(NETWORK_CLIENT_METADATA, instance, property);
            if (!isUndefined(isServer)) {
                yield property;
            }
        }
    }

    private flatMap(modules: Module[], callback: (instance: InstanceWrapper) => any | undefined) {
        const items = modules
            .map((module) => [...module.providers.values(), ...module.controllers.values()].map(callback))
            .reduce((a, b) => a.concat(b), []);
        return items.filter((element) => !!element);
    }

    private filterRequiresClient(wrapper: InstanceWrapper): any | undefined {
        const { instance } = wrapper;
        if (!instance || !instance.constructor) {
            return undefined;
        }

        let requireClient = false;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const hook of this.scanForClientHooks(instance)) {
            requireClient = true;
        }

        return requireClient ? instance : null;
    }

    private filterProvider(wrapper: InstanceWrapper, metadataKey: string): any | undefined {
        const { instance } = wrapper;

        if (!instance) {
            return undefined;
        }

        return this.extractProviderMetadata(instance, metadataKey);
    }

    private extractProviderMetadata(instance: Record<string, any>, metadataKey: string) {
        if (!instance.constructor) {
            return;
        }
        const metadata = Reflect.getMetadata(metadataKey, instance.constructor);

        return metadata ? instance : undefined;
    }
}
