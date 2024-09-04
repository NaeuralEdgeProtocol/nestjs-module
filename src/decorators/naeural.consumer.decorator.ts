import 'reflect-metadata';
import { NAEURAL_GATEWAY_METADATA } from '../naeural.constants.js';

export const NaeuralConsumer = (): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(NAEURAL_GATEWAY_METADATA, true, target);
    };
};
