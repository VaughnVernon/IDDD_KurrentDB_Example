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

import { Actor, type Protocol, type Definition } from 'domo-actors';
import type { KurrentDBClient } from '@kurrent/kurrentdb-client';
import { jsonEvent, NO_STREAM } from '@kurrent/kurrentdb-client';
import {
    AppendResult,
    Outcome,
    type Journal,
    type StreamReader,
    type JournalReader
} from 'domo-tactical/store/journal';
import {
    Result,
    type Source,
    Metadata,
    StorageException,
    EntryAdapterProvider
} from 'domo-tactical/store';
import type { Entry } from 'domo-tactical/store/journal';
import { KurrentDBStreamReader } from './KurrentDBStreamReader';
import { KurrentDBJournalReader } from './KurrentDBJournalReader';

/**
 * Journal implementation backed by KurrentDB.
 * Extends Actor for use with the actor model.
 * Provides event sourcing storage for domo-tactical entities.
 */
export class KurrentDBJournal extends Actor implements Journal<string> {
    private readonly _client: KurrentDBClient;
    private readonly _streamReaders: Map<string, StreamReader<string>> = new Map();
    private readonly _journalReaders: Map<string, JournalReader<string>> = new Map();
    private readonly _adapterProvider: EntryAdapterProvider;

    constructor(client: KurrentDBClient) {
        super();
        this._client = client;
        this._adapterProvider = EntryAdapterProvider.instance();
    }

    /**
     * Append a single Source as an Entry to the journal.
     */
    async append<S, ST>(
        streamName: string,
        streamVersion: number,
        source: Source<S>,
        metadata: Metadata
    ): Promise<AppendResult<S, ST>> {
        return this.appendInternal(streamName, streamVersion, [source], metadata, null as ST);
    }

    /**
     * Append a single Source as an Entry along with a snapshot.
     */
    async appendWith<S, ST>(
        streamName: string,
        streamVersion: number,
        source: Source<S>,
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        return this.appendInternal(streamName, streamVersion, [source], metadata, snapshot);
    }

    /**
     * Append multiple Sources as Entries to the journal.
     */
    async appendAll<S, ST>(
        streamName: string,
        fromStreamVersion: number,
        sources: Source<S>[],
        metadata: Metadata
    ): Promise<AppendResult<S, ST>> {
        return this.appendInternal(streamName, fromStreamVersion, sources, metadata, null as ST);
    }

    /**
     * Append multiple Sources as Entries along with a snapshot.
     */
    async appendAllWith<S, ST>(
        streamName: string,
        fromStreamVersion: number,
        sources: Source<S>[],
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        return this.appendInternal(streamName, fromStreamVersion, sources, metadata, snapshot);
    }

    /**
     * Get a stream reader for reading entity event streams.
     * Creates the reader as an actor under this journal's supervisor.
     */
    async streamReader(name: string): Promise<StreamReader<string>> {
        let reader = this._streamReaders.get(name);
        if (!reader) {
            const readerProtocol: Protocol = {
                type: () => 'KurrentDBStreamReader',
                instantiator: () => ({
                    instantiate: (def: Definition) => {
                        const [client, readerName] = def.parameters();
                        return new KurrentDBStreamReader(client as KurrentDBClient, readerName as string);
                    }
                })
            };

            reader = this.stage().actorFor<StreamReader<string>>(
                readerProtocol,
                undefined,
                this.supervisorName(),
                undefined,
                this._client,
                name
            );
            this._streamReaders.set(name, reader);
        }
        return reader;
    }

    /**
     * Get a journal reader for sequential access to all entries.
     * Creates the reader as an actor under this journal's supervisor.
     */
    async journalReader(name: string): Promise<JournalReader<string>> {
        let reader = this._journalReaders.get(name);
        if (!reader) {
            const readerProtocol: Protocol = {
                type: () => 'KurrentDBJournalReader',
                instantiator: () => ({
                    instantiate: (def: Definition) => {
                        const [client, readerName] = def.parameters();
                        return new KurrentDBJournalReader(client as KurrentDBClient, readerName as string);
                    }
                })
            };

            reader = this.stage().actorFor<JournalReader<string>>(
                readerProtocol,
                undefined,
                this.supervisorName(),
                undefined,
                this._client,
                name
            );
            this._journalReaders.set(name, reader);
        }
        return reader;
    }

    /**
     * Answer this actor's supervisor name, so child actors can use the same supervisor.
     */
    private supervisorName(): string {
        return this.environment().supervisorName();
    }

    /**
     * Internal append implementation.
     */
    private async appendInternal<S, ST>(
        streamName: string,
        fromStreamVersion: number,
        sources: Source<S>[],
        metadata: Metadata,
        snapshot: ST
    ): Promise<AppendResult<S, ST>> {
        if (sources.length === 0) {
            return AppendResult.forSources(
                Outcome.success(Result.Success),
                streamName,
                fromStreamVersion,
                sources,
                snapshot
            );
        }

        try {
            // Convert Sources to Entries using adapter
            const entries = this._adapterProvider.asEntries(sources, fromStreamVersion, metadata);

            // Convert Entries to KurrentDB events
            const kurrentEvents = entries.map((entry: Entry<string>) => this.entryToKurrentEvent(entry));

            // Calculate expected stream state
            // domo-tactical: version 1 = first event
            // KurrentDB: revision 0 = first event
            // For version N, expected revision is N-2 (previous event's revision)
            const streamState = this.calculateStreamState(fromStreamVersion);

            // Append to KurrentDB
            await this._client.appendToStream(streamName, kurrentEvents, {
                streamState
            });

            // Calculate final version
            const finalVersion = fromStreamVersion + sources.length - 1;

            return sources.length === 1
                ? AppendResult.forSource(
                    Outcome.success(Result.Success),
                    streamName,
                    finalVersion,
                    sources[0],
                    snapshot
                )
                : AppendResult.forSources(
                    Outcome.success(Result.Success),
                    streamName,
                    finalVersion,
                    sources,
                    snapshot
                );

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Handle concurrency violation
            if (this.isConcurrencyError(error)) {
                return sources.length === 1
                    ? AppendResult.forSource(
                        Outcome.failure(new StorageException(Result.ConcurrencyViolation, errorMessage)),
                        streamName,
                        fromStreamVersion,
                        sources[0],
                        snapshot
                    )
                    : AppendResult.forSources(
                        Outcome.failure(new StorageException(Result.ConcurrencyViolation, errorMessage)),
                        streamName,
                        fromStreamVersion,
                        sources,
                        snapshot
                    );
            }

            // Re-throw other errors
            throw error;
        }
    }

    /**
     * Convert a domo-tactical Entry to a KurrentDB event.
     */
    private entryToKurrentEvent(entry: Entry<string>) {
        const eventData = JSON.parse(entry.entryData);
        const metadataObj = entry.metadata ? JSON.parse(entry.metadata) : {};

        return jsonEvent({
            type: entry.type,
            data: eventData,
            metadata: {
                ...metadataObj,
                typeVersion: entry.typeVersion
            }
        });
    }

    /**
     * Calculate KurrentDB streamState from domo-tactical stream version.
     *
     * domo-tactical version is 1-based (first event = version 1)
     * KurrentDB revision is 0-based (first event = revision 0)
     *
     * When appending at version N:
     * - If N = 1, stream must not exist (NO_STREAM)
     * - If N > 1, expected revision is N - 2
     */
    private calculateStreamState(streamVersion: number): typeof NO_STREAM | bigint {
        if (streamVersion <= 1) {
            return NO_STREAM;
        }
        // Version 2 writes revision 1, expects revision 0 (2-2=0)
        // Version 3 writes revision 2, expects revision 1 (3-2=1)
        return BigInt(streamVersion - 2);
    }

    /**
     * Check if error is a concurrency violation.
     */
    private isConcurrencyError(error: unknown): boolean {
        if (error instanceof Error) {
            return error.message.includes('WRONG_EXPECTED_VERSION') ||
                   error.name === 'WrongExpectedVersionError';
        }
        return false;
    }
}
