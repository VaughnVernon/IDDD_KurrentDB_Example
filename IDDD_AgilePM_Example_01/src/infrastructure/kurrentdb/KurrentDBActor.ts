//   Copyright 2012-2026 Vaughn Vernon. All rights reserved.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

import { Actor } from 'domo-actors';
import {
    KurrentDBClient,
    jsonEvent,
    START,
    END,
    ANY,
    NO_STREAM,
    STREAM_EXISTS,
    FORWARDS,
    BACKWARDS,
    WrongExpectedVersionError,
    StreamDeletedError
} from '@kurrent/kurrentdb-client';
import type {
    KurrentDB,
    KurrentEventData,
    KurrentRecordedEvent,
    KurrentAppendResult,
    KurrentSubscription,
    AppendOptions,
    ReadStreamOptions,
    SubscribeToAllOptions,
    ReadAllOptions,
    ExpectedRevision,
    ReadRevision
} from './KurrentDB';

/**
 * Actor implementation of KurrentDB interface.
 * Wraps the KurrentDBClient to provide actor-based access.
 */
export class KurrentDBActor extends Actor implements KurrentDB {
    private readonly client: KurrentDBClient;

    constructor(connectionString: string) {
        super();
        this.client = KurrentDBClient.connectionString`${connectionString}`;
    }

    async appendToStream<T>(
        streamName: string,
        events: KurrentEventData<T> | KurrentEventData<T>[],
        options?: AppendOptions
    ): Promise<KurrentAppendResult> {
        const eventArray = Array.isArray(events) ? events : [events];
        const eventData = eventArray.map(e =>
            jsonEvent({
                type: e.type,
                data: e.data as Record<string, unknown>,
                metadata: e.metadata,
                id: e.id
            })
        );

        const appendOptions = options?.expectedRevision !== undefined
            ? { streamState: this.toStreamState(options.expectedRevision) }
            : undefined;

        try {
            const result = await this.client.appendToStream(streamName, eventData, appendOptions);

            return {
                success: result.success,
                nextExpectedRevision: result.nextExpectedRevision,
                position: result.position ? {
                    commit: result.position.commit,
                    prepare: result.position.prepare
                } : undefined
            };
        } catch (error) {
            // Handle concurrency violation
            if (error instanceof WrongExpectedVersionError) {
                return {
                    success: false,
                    nextExpectedRevision: -1n
                };
            }
            // Handle stream deleted (tombstoned)
            if (error instanceof StreamDeletedError) {
                return {
                    success: false,
                    nextExpectedRevision: -1n
                };
            }
            throw error;
        }
    }

    async readStream<T>(
        streamName: string,
        options?: ReadStreamOptions
    ): Promise<KurrentRecordedEvent<T>[]> {
        const readOptions: Parameters<typeof this.client.readStream>[1] = {};

        if (options?.direction) {
            readOptions.direction = options.direction === 'forwards' ? FORWARDS : BACKWARDS;
        }
        if (options?.fromRevision !== undefined) {
            readOptions.fromRevision = this.toReadRevision(options.fromRevision);
        }
        if (options?.maxCount !== undefined) {
            readOptions.maxCount = options.maxCount;
        }

        const events: KurrentRecordedEvent<T>[] = [];
        const stream = this.client.readStream(streamName, readOptions);

        for await (const resolvedEvent of stream) {
            if (resolvedEvent.event) {
                const event = resolvedEvent.event;
                const revision = typeof event.revision === 'bigint' ? event.revision : BigInt(event.revision);
                events.push({
                    streamId: event.streamId,
                    id: event.id,
                    type: event.type,
                    revision,
                    data: event.data as T,
                    metadata: event.metadata as Record<string, unknown> | undefined,
                    created: event.created,
                    position: event.position ? {
                        commit: event.position.commit,
                        prepare: event.position.prepare
                    } : undefined
                });
            }
        }

        return events;
    }

    async subscribeToStream<T>(
        streamName: string,
        fromRevision?: ReadRevision
    ): Promise<KurrentSubscription<T>> {
        const options = fromRevision !== undefined
            ? { fromRevision: this.toReadRevision(fromRevision) }
            : undefined;

        const subscription = this.client.subscribeToStream(streamName, options);

        return this.wrapSubscription<T>(subscription);
    }

    async subscribeToAll<T>(
        options?: SubscribeToAllOptions
    ): Promise<KurrentSubscription<T>> {
        const subscribeOptions: Parameters<typeof this.client.subscribeToAll>[0] = {};

        if (options?.fromPosition !== undefined) {
            if (options.fromPosition === 'start') {
                subscribeOptions.fromPosition = START;
            } else if (options.fromPosition === 'end') {
                subscribeOptions.fromPosition = END;
            } else {
                subscribeOptions.fromPosition = options.fromPosition;
            }
        }

        if (options?.filter) {
            const filter = options.filter;
            subscribeOptions.filter = {
                filterOn: filter.filterOn === 'event_type' ? 'eventType' : 'streamName',
                ...(filter.prefixes ? { prefixes: filter.prefixes } : {}),
                ...(filter.regex ? { regex: filter.regex } : {}),
                checkpointInterval: 1
            } as any;
        }

        const subscription = this.client.subscribeToAll(subscribeOptions);

        return this.wrapSubscription<T>(subscription);
    }

    async readAll<T>(
        options?: ReadAllOptions
    ): Promise<KurrentRecordedEvent<T>[]> {
        const readOptions: Parameters<typeof this.client.readAll>[0] = {};

        if (options?.direction) {
            readOptions.direction = options.direction === 'forwards' ? FORWARDS : BACKWARDS;
        }

        if (options?.fromPosition !== undefined) {
            if (options.fromPosition === 'start') {
                readOptions.fromPosition = START;
            } else if (options.fromPosition === 'end') {
                readOptions.fromPosition = END;
            } else {
                readOptions.fromPosition = options.fromPosition;
            }
        }

        if (options?.maxCount !== undefined) {
            readOptions.maxCount = options.maxCount;
        }

        if (options?.filter) {
            const filter = options.filter;
            readOptions.filter = {
                filterOn: filter.filterOn === 'event_type' ? 'eventType' : 'streamName',
                ...(filter.prefixes ? { prefixes: filter.prefixes } : {}),
                ...(filter.regex ? { regex: filter.regex } : {}),
                checkpointInterval: 1
            } as any;
        }

        const events: KurrentRecordedEvent<T>[] = [];
        const stream = this.client.readAll(readOptions);

        for await (const resolvedEvent of stream) {
            if (resolvedEvent.event) {
                const event = resolvedEvent.event;
                const revision = typeof event.revision === 'bigint' ? event.revision : BigInt(event.revision);
                events.push({
                    streamId: event.streamId,
                    id: event.id,
                    type: event.type,
                    revision,
                    data: event.data as T,
                    metadata: event.metadata as Record<string, unknown> | undefined,
                    created: event.created,
                    position: event.position ? {
                        commit: event.position.commit,
                        prepare: event.position.prepare
                    } : undefined
                });
            }
        }

        return events;
    }

    async getStreamRevision(streamName: string): Promise<bigint> {
        try {
            const events = this.client.readStream(streamName, {
                direction: BACKWARDS,
                fromRevision: END,
                maxCount: 1n
            });

            for await (const resolvedEvent of events) {
                if (resolvedEvent.event) {
                    // Ensure we always return a bigint
                    const revision = resolvedEvent.event.revision;
                    return typeof revision === 'bigint' ? revision : BigInt(revision);
                }
            }
            return -1n;
        } catch (error: any) {
            if (error.type === 'stream-not-found') {
                return -1n;
            }
            throw error;
        }
    }

    async deleteStream(
        streamName: string,
        expectedRevision?: ExpectedRevision
    ): Promise<void> {
        const options = expectedRevision !== undefined
            ? { expectedRevision: this.toStreamState(expectedRevision) }
            : undefined;

        await this.client.deleteStream(streamName, options);
    }

    async tombstoneStream(
        streamName: string,
        expectedRevision?: ExpectedRevision
    ): Promise<void> {
        const options = expectedRevision !== undefined
            ? { expectedRevision: this.toStreamState(expectedRevision) }
            : undefined;

        await this.client.tombstoneStream(streamName, options);
    }

    private toStreamState(expectedRevision: ExpectedRevision): any {
        switch (expectedRevision) {
            case 'any':
                return ANY;
            case 'no_stream':
                return NO_STREAM;
            case 'stream_exists':
                return STREAM_EXISTS;
            default:
                return expectedRevision;
        }
    }

    private toReadRevision(revision: ReadRevision): any {
        switch (revision) {
            case 'start':
                return START;
            case 'end':
                return END;
            default:
                return revision;
        }
    }

    private wrapSubscription<T>(subscription: any): KurrentSubscription<T> {
        return {
            async *[Symbol.asyncIterator](): AsyncIterableIterator<KurrentRecordedEvent<T>> {
                for await (const resolvedEvent of subscription) {
                    if (resolvedEvent.event) {
                        const event = resolvedEvent.event;
                        const revision = typeof event.revision === 'bigint' ? event.revision : BigInt(event.revision);
                        yield {
                            streamId: event.streamId,
                            id: event.id,
                            type: event.type,
                            revision,
                            data: event.data as T,
                            metadata: event.metadata as Record<string, unknown> | undefined,
                            created: event.created,
                            position: event.position ? {
                                commit: event.position.commit,
                                prepare: event.position.prepare
                            } : undefined
                        };
                    }
                }
            },
            async unsubscribe(): Promise<void> {
                await subscription.unsubscribe();
            }
        };
    }

    override async beforeStop(): Promise<void> {
        await this.client.dispose();
    }
}
