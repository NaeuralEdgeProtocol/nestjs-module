import 'reflect-metadata';
import { ZxAI_GATEWAY_METADATA } from '../zxai.constants.js';

export const ZxAIConsumer = (): ClassDecorator => {
    return (target: object) => {
        Reflect.defineMetadata(ZxAI_GATEWAY_METADATA, true, target);
    };
};
