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

import { Actor, stage, type Protocol } from 'domo-actors';
import {
    Source,
    Metadata,
    AppendResult,
    EntryStream,
    Outcome,
    Result
} from 'domo-tactical';
import type {
    Journal,
    StreamReader,
    JournalReader,
    Entry
} from 'domo-tactical';
import { v4 as uuid } from 'uuid';
import type {
    KurrentDB,
    KurrentEventData,
    KurrentRecordedEvent,
    ExpectedRevision
} from './KurrentDB';

/**
 * Adapts a KurrentDB instance to the domo-tactical Journal interface.
 *
 * This adapter allows EventSourcedEntity and SourcedEntity to use
 * KurrentDB as their event store backend.
 *
 * Key mappings:
 * - Journal.streamName -> KurrentDB stream name
 * - Journal.Entry -> KurrentDB event (serialized as JSON)
 * - Journal.streamVersion -> KurrentDB stream revision
 */
export class JournalAdapter extends Actor implements Journal<string> {
    private readonly kurrentDB: KurrentDB;
    private readonly streamReaders: Map<string, StreamReader<string>> = new Map();
    private readonly journalReaders: Map<string, JournalReader<string>> = new Map();

    constructor(kurrentDB: KurrentDB) {
        super();
        this.kurrentDB = kurrentDB;
    }

    async append<S, ST>(
        streamName: string,
        streamVersion: number,
        source: Source<S>,
        metadata: Metadata
    ): Promise<AppendResult<S, ST>> {
        return this.appendWithInternal(streamName, streamVersion, source, metadata, null as ST);
    }

    async appendWith<S, ST>(
        streamName: string,
        streamVersion: number,
        source: Source<S>,
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        return this.appendWithInternal(streamName, streamVersion, source, metadata, snapshot);
    }

    private async appendWithInternal<S, ST>(
        streamName: string,
        streamVersion: number,
        source: Source<S>,
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        try {
            const entry = this.sourceToEntry(source, streamVersion, metadata);
            const event: KurrentEventData<string> = {
                id: entry.id,
                type: entry.type,
                data: entry.entryData,
                metadata: {
                    typeVersion: entry.typeVersion,
                    metadata: entry.metadata
                }
            };

            const expectedRevision = this.toExpectedRevision(streamVersion);

            const result = await this.kurrentDB.appendToStream(streamName, event, {
                expectedRevision
            });

            if (!result.success) {
                return AppendResult.forSource(
                    Outcome.failure({ result: Result.ConcurrencyViolation, message: 'Append failed' } as any),
                    streamName,
                    streamVersion,
                    source,
                    snapshot
                );
            }

            return AppendResult.forSource(
                Outcome.success(Result.Success),
                streamName,
                streamVersion,
                source,
                snapshot
            );
        } catch (error: any) {
            if (error.type === 'wrong-expected-version') {
                return AppendResult.forSource(
                    Outcome.failure({ result: Result.ConcurrencyViolation, message: error.message } as any),
                    streamName,
                    streamVersion,
                    source,
                    snapshot
                );
            }
            throw error;
        }
    }

    async appendAll<S, ST>(
        streamName: string,
        fromStreamVersion: number,
        sources: Source<S>[],
        metadata: Metadata
    ): Promise<AppendResult<S, ST>> {
        return this.appendAllWith(streamName, fromStreamVersion, sources, metadata, null as ST);
    }

    async appendAllWith<S, ST>(
        streamName: string,
        fromStreamVersion: number,
        sources: Source<S>[],
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        try {
            // Convert sources to KurrentDB events
            const events: KurrentEventData<string>[] = sources.map((source, index) => {
                const entry = this.sourceToEntry(source, fromStreamVersion + index, metadata);
                return {
                    id: entry.id,
                    type: entry.type,
                    data: entry.entryData,
                    metadata: {
                        typeVersion: entry.typeVersion,
                        metadata: entry.metadata
                    }
                };
            });

            // Calculate expected revision for optimistic concurrency
            // domo-tactical uses 1-based versions, KurrentDB uses 0-based revisions
            const expectedRevision = this.toExpectedRevision(fromStreamVersion);

            // Append events to KurrentDB
            const result = await this.kurrentDB.appendToStream(streamName, events, {
                expectedRevision
            });

            if (!result.success) {
                return AppendResult.forSources(
                    Outcome.failure({ result: Result.ConcurrencyViolation, message: 'Append failed' } as any),
                    streamName,
                    fromStreamVersion + sources.length - 1,
                    sources,
                    snapshot
                );
            }

            // TODO: Handle snapshot storage if needed
            // KurrentDB doesn't have built-in snapshot support, would need separate stream

            const finalVersion = fromStreamVersion + sources.length - 1;
            return AppendResult.forSources(
                Outcome.success(Result.Success),
                streamName,
                finalVersion,
                sources,
                snapshot
            );
        } catch (error: any) {
            // Check if it's a concurrency violation
            if (error.type === 'wrong-expected-version') {
                return AppendResult.forSources(
                    Outcome.failure({ result: Result.ConcurrencyViolation, message: error.message } as any),
                    streamName,
                    fromStreamVersion,
                    sources,
                    snapshot
                );
            }
            throw error;
        }
    }

    async streamReader(name: string): Promise<StreamReader<string>> {
        let reader = this.streamReaders.get(name);
        if (!reader) {
            reader = await this.createStreamReader(name);
            this.streamReaders.set(name, reader);
        }
        return reader;
    }

    async journalReader(name: string): Promise<JournalReader<string>> {
        let reader = this.journalReaders.get(name);
        if (!reader) {
            reader = await this.createJournalReader(name);
            this.journalReaders.set(name, reader);
        }
        return reader;
    }

    /**
     * Convert domo-tactical stream version (1-based) to KurrentDB expected revision.
     */
    private toExpectedRevision(streamVersion: number): ExpectedRevision {
        if (streamVersion === 1) {
            return 'no_stream';
        }
        // domo-tactical version N means KurrentDB revision N-2
        // (version 1 = no events yet, version 2 = 1 event at revision 0, etc.)
        return BigInt(streamVersion - 2);
    }

    /**
     * Convert a Source to an Entry for storage.
     */
    private sourceToEntry(source: Source<any>, _version: number, metadata: Metadata): Entry<string> {
        const entryId = uuid();
        const typeName = source.typeName();
        const typeVersion = source.sourceTypeVersion;

        // Serialize the source to JSON
        const entryData = JSON.stringify(source);
        const metadataJson = JSON.stringify({
            operation: metadata.operation,
            value: metadata.value,
            properties: Object.fromEntries(metadata.properties)
        });

        return {
            id: entryId,
            type: typeName,
            typeVersion,
            entryData,
            metadata: metadataJson
        };
    }

    /**
     * Convert a KurrentDB recorded event back to an Entry.
     */
    private recordedEventToEntry(event: KurrentRecordedEvent<string>): Entry<string> {
        const eventMetadata = event.metadata as { typeVersion?: number; metadata?: string } | undefined;
        return {
            id: event.id,
            type: event.type,
            typeVersion: eventMetadata?.typeVersion ?? 1,
            entryData: typeof event.data === 'string' ? event.data : JSON.stringify(event.data),
            metadata: eventMetadata?.metadata ?? '{}'
        };
    }

    /**
     * Answer this actor's supervisor name, so child actors can use the same supervisor.
     */
    private supervisorName(): string {
        return (this as any).environment().supervisorName();
    }

    /**
     * Create a StreamReader actor for reading entity streams.
     */
    private async createStreamReader(name: string): Promise<StreamReader<string>> {
        const kurrentDB = this.kurrentDB;
        const recordedEventToEntry = this.recordedEventToEntry.bind(this);

        const protocol: Protocol = {
            type: () => `KurrentStreamReader-${name}`,
            instantiator: () => ({
                instantiate: () => new KurrentStreamReader(kurrentDB, recordedEventToEntry)
            })
        };

        return stage().actorFor<StreamReader<string>>(protocol, undefined, this.supervisorName());
    }

    /**
     * Create a JournalReader actor for CQRS projections.
     */
    private async createJournalReader(name: string): Promise<JournalReader<string>> {
        const kurrentDB = this.kurrentDB;
        const recordedEventToEntry = this.recordedEventToEntry.bind(this);

        const protocol: Protocol = {
            type: () => `KurrentJournalReader-${name}`,
            instantiator: () => ({
                instantiate: () => new KurrentJournalReader(kurrentDB, name, recordedEventToEntry)
            })
        };

        return stage().actorFor<JournalReader<string>>(protocol, undefined, this.supervisorName());
    }
}

/**
 * StreamReader implementation that reads from a KurrentDB stream.
 */
class KurrentStreamReader extends Actor implements StreamReader<string> {
    constructor(
        private readonly kurrentDB: KurrentDB,
        private readonly recordedEventToEntry: (event: KurrentRecordedEvent<string>) => Entry<string>
    ) {
        super();
    }

    async streamFor(streamName: string): Promise<EntryStream<string>> {
        try {
            const events = await this.kurrentDB.readStream<string>(streamName, {
                direction: 'forwards',
                fromRevision: 'start'
            });

            const entries = events.map(this.recordedEventToEntry);

            // KurrentDB revision is 0-based, domo-tactical version is 1-based
            // Stream version = number of events = last revision + 1
            const streamVersion = events.length > 0
                ? Number(events[events.length - 1].revision) + 1
                : 0;

            return new EntryStream(
                streamName,
                streamVersion,
                entries,
                null // No snapshot support yet
            );
        } catch (error: any) {
            // Stream not found - return empty stream
            if (error.type === 'stream-not-found') {
                return new EntryStream(streamName, 0, [], null);
            }
            throw error;
        }
    }
}

/**
 * JournalReader implementation that reads all events from KurrentDB.
 * Uses subscribeToAll with filtering to read all domain events.
 */
class KurrentJournalReader extends Actor implements JournalReader<string> {
    private currentPosition: number = 0;
    private cachedEntries: Entry<string>[] = [];
    private isSubscribed: boolean = false;

    constructor(
        private readonly kurrentDB: KurrentDB,
        private readonly readerName: string,
        private readonly recordedEventToEntry: (event: KurrentRecordedEvent<string>) => Entry<string>
    ) {
        super();
    }

    async readNext(max: number): Promise<Entry<string>[]> {
        // Ensure we have entries loaded
        await this.ensureEntriesLoaded();

        const start = this.currentPosition;
        const end = Math.min(start + max, this.cachedEntries.length);
        const entries = this.cachedEntries.slice(start, end);

        this.currentPosition = end;
        return entries;
    }

    async name(): Promise<string> {
        return this.readerName;
    }

    async seek(position: number): Promise<void> {
        this.currentPosition = Math.max(0, position);
    }

    async position(): Promise<number> {
        return this.currentPosition;
    }

    async rewind(): Promise<void> {
        this.currentPosition = 0;
    }

    /**
     * Load all entries from KurrentDB if not already loaded.
     * This uses readAll with system event filtering.
     */
    private async ensureEntriesLoaded(): Promise<void> {
        if (this.isSubscribed) {
            return;
        }

        try {
            // Read all events, filtering out system events
            const events = await this.kurrentDB.readAll<string>({
                direction: 'forwards',
                fromPosition: 'start',
                filter: {
                    filterOn: 'stream_name',
                    regex: '^(?!\$).*' // Exclude streams starting with $
                }
            });

            // Convert all events to entries
            for (const event of events) {
                this.cachedEntries.push(this.recordedEventToEntry(event));
            }

            this.isSubscribed = true;
        } catch (error) {
            // If read fails, fall back to empty state
            console.error('Failed to read from KurrentDB $all stream:', error);
            this.isSubscribed = true;
        }
    }
}

/**
 * Protocol for creating JournalAdapter actors.
 *
 * @param kurrentDB - The KurrentDB instance to wrap
 */
function journalAdapterProtocol(kurrentDB: KurrentDB): Protocol {
    return {
        type: () => 'JournalAdapter',
        instantiator: () => ({
            instantiate: () => new JournalAdapter(kurrentDB)
        })
    };
}

/**
 * Factory method to create a JournalAdapter actor instance.
 *
 * @param kurrentDB - The KurrentDB instance to adapt
 * @param supervisorName - Optional supervisor name (defaults to 'default')
 * @returns Journal<string> actor instance
 *
 * @example
 * ```typescript
 * const kurrentDB = kurrentInstance('esdb://localhost:2113?tls=false');
 * const journal = journalAdapter(kurrentDB);
 *
 * // Use with EventSourcedEntity
 * const entity = stage().actorFor(myEntityProtocol(journal));
 * ```
 */
export function journalAdapter(kurrentDB: KurrentDB, supervisorName: string = 'default'): Journal<string> {
    return stage().actorFor<Journal<string>>(journalAdapterProtocol(kurrentDB), undefined, supervisorName);
}
