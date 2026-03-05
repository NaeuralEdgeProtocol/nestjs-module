# @hyfy/nestjs-module

Official NestJS integration for NaeuralEdgeProtocol.

This package wraps `@hyfy/jsclient` in a global NestJS module and wires class/method decorators to Naeural payloads, streams, and client events.

## Purpose

Use this module when you want to:

- boot a Naeural client through Nest dependency injection
- subscribe Nest providers to network payload signatures and streams
- react to low-level client lifecycle/events
- inject the active Naeural client instance into application services

## What The Module Does

- Registers a default Naeural client provider using token `naeural:client`.
- Boots the client automatically when created.
- On app bootstrap, discovers providers marked with `@NaeuralConsumer()` and subscribes their decorated handlers.
- Supports payload argument mapping with:
  - `@PluginError()`
  - `@NaeuralContext()`
  - `@PluginPayload()`
- Injects the active client into properties decorated with `@NetworkClient()`.
- Calls `client.shutdown()` during `onApplicationShutdown()`.

## Installation

```bash
npm install @hyfy/nestjs-module @hyfy/jsclient
```

NestJS projects already use `reflect-metadata`, but ensure it is available in your runtime.

## Quick Start

```ts
import { Module } from '@nestjs/common';
import { NaeuralModule, NaeuralModuleOptions } from '@hyfy/nestjs-module';

const naeuralOptions: NaeuralModuleOptions = {
    // Provide valid NaeuralOptions from @hyfy/jsclient.
};

@Module({
    imports: [NaeuralModule.register(naeuralOptions)],
})
export class AppModule {}
```

## Async Registration

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NaeuralModule, NaeuralModuleOptions } from '@hyfy/nestjs-module';

@Module({
    imports: [
        ConfigModule.forRoot(),
        NaeuralModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (config: ConfigService): Promise<NaeuralModuleOptions> => {
                return config.getOrThrow<NaeuralModuleOptions>('naeural');
            },
        }),
    ],
})
export class AppModule {}
```

## Consumer Example

```ts
import { Injectable } from '@nestjs/common';
import {
    InstancePayload,
    NaeuralConsumer,
    NaeuralContext,
    NetworkClient,
    NetworkClientEvent,
    NetworkStream,
    PluginError,
    PluginPayload,
} from '@hyfy/nestjs-module';
import { Naeural, NaeuralEvent } from '@hyfy/jsclient';

@NaeuralConsumer()
@Injectable()
export class AlertsConsumer {
    @NetworkClient()
    private client!: Naeural;

    @InstancePayload('edge.node.plugin.signature')
    onPluginPayload(
        @PluginError() err: unknown,
        @NaeuralContext() context: unknown,
        @PluginPayload() payload: unknown,
    ) {
        if (err) {
            return;
        }

        // Handle payload with execution context.
    }

    @NetworkStream('edge.node.stream.signature')
    onStream(message: unknown) {
        // Handle stream messages.
    }

    @NetworkClientEvent(NaeuralEvent.NAEURAL_ENGINE_REGISTERED)
    onEngineRegistered(status: unknown) {
        // Handle client event callbacks.
    }
}
```

## Decorators API

- `@NaeuralConsumer()`:
  marks a class for metadata discovery/subscription.
- `@InstancePayload(signature)`:
  subscribes a method to a payload signature.
- `@NetworkStream(stream)`:
  subscribes a method to a stream via `client.getStream(...)`.
- `@NetworkClientEvent(event)`:
  subscribes a method to direct client event emissions.
- `@NetworkClient()`:
  injects the active Naeural client instance into a property.
- `@PluginError()`, `@NaeuralContext()`, `@PluginPayload()`:
  map payload-handler arguments by decorator instead of fixed parameter order.

## Public Exports

The package exports:

- `NaeuralModule`
- constants: `NAEURAL_MODULE_OPTIONS`, `DEFAULT_CLIENT_NAME`
- all decorators under `src/decorators`
- module interfaces (`NaeuralModuleOptions`, async options types, gateway interface)
- complete `@hyfy/jsclient` re-export

## Lifecycle Notes

- Subscriptions are connected in `onApplicationBootstrap()`.
- Client shutdown is attempted in `onApplicationShutdown()`, with guarded logging on error.
- The module logs client lifecycle events (connect, boot, shutdown, engine registration changes, topic subscription actions).

## Development

Available scripts:

```bash
npm run format
npm run lint
npm run neural:generate
```

Build declarations/output:

```bash
npx tsc -p tsconfig.build.json
```

## Current Gaps

- No automated test suite is included in this repository yet.
- `NaeuralOptionsFactory.createNaeuralOptions(initiator?: string)` is present with a TODO in source comments; verify custom factory flows if extending this area.
