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
import type { KurrentDBClient } from '@kurrent/kurrentdb-client';
import { FORWARDS, START, BACKWARDS, END, StreamNotFoundError, StreamDeletedError } from '@kurrent/kurrentdb-client';
import { EntryStream, type StreamReader, type Entry, TextEntry } from 'domo-tactical/store/journal';
import { type State, ObjectState } from 'domo-tactical/store';

/**
 * Snapshot metadata stored in KurrentDB metadata stream.
 */
interface SnapshotMetadata {
    snapshotType: string;
    snapshotTypeVersion: number;
    snapshotVersion: number;
    snapshotData: unknown;
}

/**
 * StreamReader implementation backed by KurrentDB.
 * Extends Actor for compatibility with the Journal actor model.
 * Reads events for a specific stream (entity).
 *
 * @template T the type of entry data (typically string for JSON)
 */
export class KurrentDBStreamReader<T> extends Actor implements StreamReader<T> {
    private readonly _client: KurrentDBClient;

    /** Prefix for snapshot streams */
    private static readonly SNAPSHOT_STREAM_PREFIX = '$snapshot-';

    constructor(client: KurrentDBClient, _readerName: string) {
        super();
        this._client = client;
        // Note: _readerName is accepted but not stored as it's not currently used
    }

    /**
     * Read all events from a specific stream.
     */
    async streamFor(streamName: string): Promise<EntryStream<T>> {
        try {
            const eventsIterator = this._client.readStream(streamName, {
                direction: FORWARDS,
                fromRevision: START
            });

            const entries: TextEntry[] = [];
            let maxVersion = 0;

            for await (const resolvedEvent of eventsIterator) {
                const event = resolvedEvent.event;
                if (!event) continue;

                const streamVersion = Number(event.revision) + 1; // Convert to 1-based version
                maxVersion = Math.max(maxVersion, streamVersion);

                const eventMetadata = event.metadata as { typeVersion?: number; metadata?: string } | undefined;

                entries.push(new TextEntry(
                    event.id,
                    event.type,
                    eventMetadata?.typeVersion ?? 1,
                    JSON.stringify(event.data),
                    streamVersion,
                    eventMetadata?.metadata ?? '{}'
                ));
            }

            if (entries.length === 0) {
                return new EntryStream<T>(streamName, 0, [], null);
            }

            // Try to load snapshot
            const snapshot = await this.loadSnapshot(streamName);

            // Cast entries to Entry<T>[] - TextEntry extends Entry<string> and T is typically string
            return new EntryStream<T>(streamName, maxVersion, entries as unknown as Entry<T>[], snapshot);
        } catch (error) {
            if (error instanceof StreamNotFoundError) {
                return new EntryStream<T>(streamName, 0, [], null);
            }
            if (error instanceof StreamDeletedError) {
                // Stream was deleted/tombstoned - return empty stream
                return new EntryStream<T>(streamName, 0, [], null);
            }
            throw error;
        }
    }

    /**
     * Load the latest snapshot for a stream.
     */
    private async loadSnapshot(streamName: string): Promise<State<unknown> | null> {
        try {
            const snapshotStreamName = `${KurrentDBStreamReader.SNAPSHOT_STREAM_PREFIX}${streamName}`;

            // Read the latest snapshot event
            const eventsIterator = this._client.readStream(snapshotStreamName, {
                direction: BACKWARDS,
                fromRevision: END,
                maxCount: 1
            });

            for await (const resolvedEvent of eventsIterator) {
                const event = resolvedEvent.event;
                if (!event) continue;

                const snapData = event.data as unknown as SnapshotMetadata;
                // Create a named function to satisfy the State constructor's type parameter
                // The actual type resolution happens elsewhere based on the type name
                const snapshotTypeFunc = function() {} as unknown as Function;
                Object.defineProperty(snapshotTypeFunc, 'name', { value: snapData.snapshotType });
                return new ObjectState(
                    streamName,
                    snapshotTypeFunc,
                    snapData.snapshotTypeVersion,
                    snapData.snapshotData,
                    snapData.snapshotVersion
                );
            }

            return null;
        } catch {
            // Snapshot stream may not exist
            return null;
        }
    }
}
