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

import { stage, type ActorProtocol, type Protocol } from 'domo-actors';
import { KurrentDBActor } from './KurrentDBActor';

/**
 * Event data for appending to KurrentDB.
 * Matches KurrentDB's EventData structure.
 */
export interface KurrentEventData<T = unknown> {
    /** Unique identifier for this event (UUID) */
    id: string;
    /** Event type name (e.g., "ProductInitiated") */
    type: string;
    /** Event payload data */
    data: T;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * A recorded event from KurrentDB.
 * Matches KurrentDB's RecordedEvent structure.
 */
export interface KurrentRecordedEvent<T = unknown> {
    /** The stream this event belongs to */
    streamId: string;
    /** Unique identifier (UUID) */
    id: string;
    /** Event type name */
    type: string;
    /** Event revision in the stream */
    revision: bigint;
    /** Event payload data */
    data: T;
    /** Event metadata */
    metadata?: Record<string, unknown>;
    /** When this event was created */
    created: Date;
    /** Position in the global log */
    position?: KurrentPosition;
}

/**
 * Position in the global transaction log.
 */
export interface KurrentPosition {
    commit: bigint;
    prepare: bigint;
}

/**
 * Result of an append operation.
 * Matches KurrentDB's AppendResult.
 */
export interface KurrentAppendResult {
    /** Whether the append was successful */
    success: boolean;
    /** The next expected revision for subsequent appends */
    nextExpectedRevision: bigint;
    /** Position in the global log */
    position?: KurrentPosition;
}

/**
 * Expected revision constants for optimistic concurrency.
 */
export type ExpectedRevision = 'any' | 'no_stream' | 'stream_exists' | bigint;

/**
 * Options for appending to a stream.
 */
export interface AppendOptions {
    /** Expected stream state for optimistic concurrency */
    expectedRevision?: ExpectedRevision;
}

/**
 * Direction for reading events.
 */
export type ReadDirection = 'forwards' | 'backwards';

/**
 * Starting revision for reading.
 */
export type ReadRevision = 'start' | 'end' | bigint;

/**
 * Options for reading a stream.
 */
export interface ReadStreamOptions {
    /** Direction: 'forwards' or 'backwards' */
    direction?: ReadDirection;
    /** Starting revision */
    fromRevision?: ReadRevision;
    /** Maximum number of events to read */
    maxCount?: bigint;
}

/**
 * Starting position for subscribing to all.
 */
export type SubscribePosition = 'start' | 'end' | KurrentPosition;

/**
 * Filter options for subscriptions.
 */
export interface SubscriptionFilter {
    filterOn: 'event_type' | 'stream_name';
    prefixes?: string[];
    regex?: string;
}

/**
 * Options for subscribing to all events.
 */
export interface SubscribeToAllOptions {
    /** Starting position */
    fromPosition?: SubscribePosition;
    /** Filter by event type or stream name */
    filter?: SubscriptionFilter;
}

/**
 * Options for reading all events.
 */
export interface ReadAllOptions {
    /** Direction: 'forwards' or 'backwards' */
    direction?: ReadDirection;
    /** Starting position */
    fromPosition?: SubscribePosition;
    /** Maximum number of events to read */
    maxCount?: bigint;
    /** Filter by event type or stream name */
    filter?: SubscriptionFilter;
}

/**
 * Subscription handle for consuming events.
 */
export interface KurrentSubscription<T = unknown> {
    /** Async iterator for events */
    [Symbol.asyncIterator](): AsyncIterableIterator<KurrentRecordedEvent<T>>;
    /** Unsubscribe and close */
    unsubscribe(): Promise<void>;
}

/**
 * KurrentDB interface.
 *
 * Follows the KurrentDB API patterns while being an Actor.
 * Provides event sourcing operations: append, read, and subscribe.
 */
export interface KurrentDB extends ActorProtocol {
    /**
     * Append events to a stream.
     *
     * @param streamName - The stream to append to
     * @param events - One or more events to append
     * @param options - Append options including expected revision
     */
    appendToStream<T>(
        streamName: string,
        events: KurrentEventData<T> | KurrentEventData<T>[],
        options?: AppendOptions
    ): Promise<KurrentAppendResult>;

    /**
     * Read events from a stream.
     *
     * @param streamName - The stream to read from
     * @param options - Read options (direction, fromRevision, maxCount)
     */
    readStream<T>(
        streamName: string,
        options?: ReadStreamOptions
    ): Promise<KurrentRecordedEvent<T>[]>;

    /**
     * Subscribe to a specific stream for real-time events.
     *
     * @param streamName - The stream to subscribe to
     * @param fromRevision - Starting revision ('start', 'end', or bigint)
     */
    subscribeToStream<T>(
        streamName: string,
        fromRevision?: ReadRevision
    ): Promise<KurrentSubscription<T>>;

    /**
     * Subscribe to all events across all streams.
     * Primary method for CQRS projections.
     *
     * @param options - Subscribe options (fromPosition, filter)
     */
    subscribeToAll<T>(
        options?: SubscribeToAllOptions
    ): Promise<KurrentSubscription<T>>;

    /**
     * Read all events across all streams (non-blocking).
     * Unlike subscribeToAll, this reads historical events and returns.
     *
     * @param options - Read options (direction, fromPosition, maxCount, filter)
     */
    readAll<T>(
        options?: ReadAllOptions
    ): Promise<KurrentRecordedEvent<T>[]>;

    /**
     * Get the current revision of a stream.
     * Returns -1n if stream doesn't exist.
     *
     * @param streamName - The stream to check
     */
    getStreamRevision(streamName: string): Promise<bigint>;

    /**
     * Soft delete a stream (can be recreated).
     *
     * @param streamName - The stream to delete
     * @param expectedRevision - Expected revision for optimistic concurrency
     */
    deleteStream(
        streamName: string,
        expectedRevision?: ExpectedRevision
    ): Promise<void>;

    /**
     * Hard delete (tombstone) a stream (cannot be recreated).
     *
     * @param streamName - The stream to tombstone
     * @param expectedRevision - Expected revision for optimistic concurrency
     */
    tombstoneStream(
        streamName: string,
        expectedRevision?: ExpectedRevision
    ): Promise<void>;
}

/**
 * Protocol for creating KurrentDBActor instances.
 *
 * @param connectionString - KurrentDB connection string (e.g., 'esdb://localhost:2113?tls=false')
 */
function kurrentDBProtocol(connectionString: string): Protocol {
    return {
        type: () => 'KurrentDB',
        instantiator: () => ({
            instantiate: () => new KurrentDBActor(connectionString)
        })
    };
}

/**
 * Factory method to create a KurrentDB actor instance.
 *
 * @param connectionString - KurrentDB connection string (e.g., 'esdb://localhost:2113?tls=false')
 * @param supervisorName - Optional supervisor name (defaults to 'default')
 * @returns KurrentDB actor instance
 *
 * @example
 * ```typescript
 * const kurrentDB = kurrentInstance('esdb://localhost:2113?tls=false');
 * await kurrentDB.appendToStream('my-stream', event);
 * ```
 */
export function kurrentInstance(connectionString: string, supervisorName: string = 'default'): KurrentDB {
    return stage().actorFor<KurrentDB>(kurrentDBProtocol(connectionString), undefined, supervisorName);
}
