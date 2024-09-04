import { STREAM_MAPPING_METADATA, STREAM_SUBSCRIPTION_METADATA } from '../naeural.constants.js';

/**
 * Subscribe to NaeuralEdgeProtocol Network event stream.
 *
 * @param stream
 * @constructor
 */
export const NetworkStream = (stream: string): MethodDecorator => {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(STREAM_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(STREAM_SUBSCRIPTION_METADATA, stream, descriptor.value);
        return descriptor;
    };
};
