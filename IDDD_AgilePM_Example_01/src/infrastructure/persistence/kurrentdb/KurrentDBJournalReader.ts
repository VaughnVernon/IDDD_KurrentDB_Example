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
import { FORWARDS, START } from '@kurrent/kurrentdb-client';
import type { JournalReader, Entry } from 'domo-tactical/store/journal';
import { TextEntry } from 'domo-tactical/store/journal';

/**
 * JournalReader implementation backed by KurrentDB.
 * Extends Actor for compatibility with the Journal actor model.
 * Reads all events across all streams in chronological order.
 * Used for CQRS projections.
 *
 * @template T the type of entry data (typically string for JSON)
 *
 * @example
 * ```typescript
 * const reader = await journal.journalReader('my-projection')
 *
 * // Read entries in batches
 * let entries = await reader.readNext(100)
 * while (entries.length > 0) {
 *   for (const entry of entries) {
 *     // Process entry
 *   }
 *   entries = await reader.readNext(100)
 * }
 * ```
 */
export class KurrentDBJournalReader<T> extends Actor implements JournalReader<T> {
    private readonly _name: string;
    private readonly _client: KurrentDBClient;
    private _currentPosition: bigint = BigInt(0);
    private _commitPosition: bigint = BigInt(0);

    constructor(client: KurrentDBClient, readerName: string) {
        super();
        this._name = readerName;
        this._client = client;
    }

    /**
     * Answer the name of this reader.
     */
    async name(): Promise<string> {
        return this._name;
    }

    /**
     * Answer the current reading position (0-based index).
     */
    async position(): Promise<number> {
        return Number(this._currentPosition);
    }

    /**
     * Read the next available entries up to the maximum count.
     */
    async readNext(max: number): Promise<Entry<T>[]> {
        if (max <= 0) {
            throw new Error('max must be greater than 0');
        }

        const entries: TextEntry[] = [];

        // Read from $all stream
        const eventsIterator = this._client.readAll({
            direction: FORWARDS,
            fromPosition: this._currentPosition === BigInt(0)
                ? START
                : { commit: this._commitPosition, prepare: this._commitPosition },
            maxCount: max * 2 // Read extra to account for filtering system events
        });

        let count = 0;
        for await (const resolvedEvent of eventsIterator) {
            const event = resolvedEvent.event;
            if (!event) continue;

            // Skip system events (those starting with $)
            if (event.type.startsWith('$')) continue;

            // Skip snapshot streams
            if (event.streamId.startsWith('$snapshot-')) continue;

            const eventMetadata = event.metadata as { typeVersion?: number; metadata?: string } | undefined;
            // Convert 0-based revision to 1-based streamVersion
            const streamVersion = Number(event.revision) + 1;

            entries.push(new TextEntry(
                event.id,
                event.type,
                eventMetadata?.typeVersion ?? 1,
                JSON.stringify(event.data),
                streamVersion,
                eventMetadata?.metadata ?? '{}'
            ));

            count++;

            // Update position
            if (resolvedEvent.commitPosition !== undefined) {
                this._commitPosition = resolvedEvent.commitPosition;
                this._currentPosition = this._commitPosition;
            }

            if (count >= max) break;
        }

        // Cast to Entry<T>[] for return type compatibility
        return entries as unknown as Entry<T>[];
    }

    /**
     * Seek to a specific position in the journal.
     */
    async seek(position: number): Promise<void> {
        if (position < 0) {
            throw new Error('position cannot be negative');
        }

        // In KurrentDB, we need to convert numeric position to commit position
        // For simplicity, we read from the beginning and skip to the desired position
        // A more efficient implementation would store commit positions
        this._currentPosition = BigInt(position);
        this._commitPosition = BigInt(position);
    }

    /**
     * Rewind to the beginning of the journal.
     */
    async rewind(): Promise<void> {
        this._currentPosition = BigInt(0);
        this._commitPosition = BigInt(0);
    }
}
