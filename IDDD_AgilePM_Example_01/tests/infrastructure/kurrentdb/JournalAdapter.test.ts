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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { stage, Stage } from 'domo-actors';
import { Source, Metadata, DomainEvent } from 'domo-tactical';
import {
    kurrentInstance,
    journalAdapter,
    type KurrentDB
} from '../../../src/infrastructure/kurrentdb';
import type { Journal } from 'domo-tactical';
import { v4 as uuid } from 'uuid';

// Test event classes
class AccountOpened extends DomainEvent {
    constructor(
        public readonly accountId: string,
        public readonly name: string,
        public readonly initialBalance: number
    ) {
        super();
    }

    override id(): string {
        return this.accountId;
    }
}

class FundsDeposited extends DomainEvent {
    constructor(
        public readonly accountId: string,
        public readonly amount: number
    ) {
        super();
    }

    override id(): string {
        return this.accountId;
    }
}

class FundsWithdrawn extends DomainEvent {
    constructor(
        public readonly accountId: string,
        public readonly amount: number
    ) {
        super();
    }

    override id(): string {
        return this.accountId;
    }
}

/**
 * JournalAdapter integration tests.
 *
 * These tests verify that JournalAdapter correctly adapts KurrentDB
 * to the domo-tactical Journal interface.
 *
 * To run:
 * 1. Start KurrentDB: docker compose up -d
 * 2. Set environment variable: TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false
 * 3. Run tests: npm test -- tests/infrastructure/kurrentdb/JournalAdapter.test.ts
 */
describe('JournalAdapter', () => {
    let kurrentDB: KurrentDB;
    let journal: Journal<string>;
    let testStage: Stage;
    let connectionString: string | undefined;

    beforeAll(async () => {
        connectionString = process.env.TEST_KURRENTDB_URL;

        if (!connectionString) {
            console.log('Skipping JournalAdapter tests - TEST_KURRENTDB_URL not set');
            console.log('To run: docker compose up -d && TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false npm test');
            return;
        }

        testStage = stage();
        kurrentDB = kurrentInstance(connectionString);
        journal = journalAdapter(kurrentDB);
    });

    afterAll(async () => {
        if (testStage) {
            await testStage.close();
        }
    });

    describe('append', () => {
        it('should append a single event to a new stream', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const event = new AccountOpened('acc-123', 'Alice', 1000);

            const result = await journal.append(
                streamName,
                1, // domo-tactical uses 1-based versions, 1 = new stream
                event,
                Metadata.nullMetadata()
            );

            expect(result.isSuccess()).toBe(true);
            expect(result.streamVersion).toBe(1);
            expect(result.source).toBe(event);
        });

        it('should append to existing stream with correct version', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const event1 = new AccountOpened('acc-456', 'Bob', 500);
            const event2 = new FundsDeposited('acc-456', 100);

            // Create stream
            await journal.append(streamName, 1, event1, Metadata.nullMetadata());

            // Append to existing stream (version 2 means expecting 1 event)
            const result = await journal.append(streamName, 2, event2, Metadata.nullMetadata());

            expect(result.isSuccess()).toBe(true);
            expect(result.streamVersion).toBe(2);
        });

        it('should detect concurrency violation on wrong version', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const event1 = new AccountOpened('acc-789', 'Charlie', 200);
            const event2 = new FundsDeposited('acc-789', 50);

            // Create stream
            await journal.append(streamName, 1, event1, Metadata.nullMetadata());

            // Try to append with wrong version (expecting new stream)
            const result = await journal.append(streamName, 1, event2, Metadata.nullMetadata());

            expect(result.isFailure()).toBe(true);
        });
    });

    describe('appendWith', () => {
        it('should append event with snapshot', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const event = new AccountOpened('snap-1', 'Snapshot', 1000);
            const snapshot = { balance: 1000, name: 'Snapshot' };

            const result = await journal.appendWith(
                streamName,
                1,
                event,
                Metadata.nullMetadata(),
                snapshot
            );

            expect(result.isSuccess()).toBe(true);
            expect(result.snapshot).toEqual(snapshot);
        });
    });

    describe('appendAll', () => {
        it('should append multiple events', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const events = [
                new AccountOpened('multi-1', 'Multi', 0),
                new FundsDeposited('multi-1', 500),
                new FundsDeposited('multi-1', 300)
            ] as Source<unknown>[];

            const result = await journal.appendAll(
                streamName,
                1,
                events,
                Metadata.nullMetadata()
            );

            expect(result.isSuccess()).toBe(true);
            expect(result.streamVersion).toBe(3);
            expect(result.sources?.length).toBe(3);
        });

        it('should handle empty events array', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;

            const result = await journal.appendAll(
                streamName,
                1,
                [],
                Metadata.nullMetadata()
            );

            expect(result.isSuccess()).toBe(true);
        });
    });

    describe('appendAllWith', () => {
        it('should append multiple events with snapshot', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const events = [
                new AccountOpened('allwith-1', 'AllWith', 1000),
                new FundsDeposited('allwith-1', 500),
                new FundsWithdrawn('allwith-1', 200)
            ] as Source<unknown>[];
            const snapshot = { balance: 1300, name: 'AllWith' };

            const result = await journal.appendAllWith(
                streamName,
                1,
                events,
                Metadata.nullMetadata(),
                snapshot
            );

            expect(result.isSuccess()).toBe(true);
            expect(result.streamVersion).toBe(3);
            expect(result.snapshot).toEqual(snapshot);
        });
    });

    describe('streamReader', () => {
        it('should read stream entries', async () => {
            if (!connectionString) return;

            const streamName = `account-${Date.now()}-${uuid().slice(0, 8)}`;
            const events = [
                new AccountOpened('read-1', 'Reader', 1000),
                new FundsDeposited('read-1', 200)
            ] as Source<unknown>[];

            await journal.appendAll(streamName, 1, events, Metadata.nullMetadata());

            // Get stream reader
            const reader = await journal.streamReader('test-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.streamVersion).toBe(2);
            expect(stream.entries.length).toBe(2);
            expect(stream.entries[0].type).toBe('AccountOpened');
            expect(stream.entries[1].type).toBe('FundsDeposited');
        });

        it('should return empty stream for non-existent stream', async () => {
            if (!connectionString) return;

            const streamName = `nonexistent-${Date.now()}-${uuid().slice(0, 8)}`;

            const reader = await journal.streamReader('empty-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.entries.length).toBe(0);
            expect(stream.streamVersion).toBe(0);
        });

        it('should reuse the same reader instance', async () => {
            if (!connectionString) return;

            const reader1 = await journal.streamReader('shared-reader');
            const reader2 = await journal.streamReader('shared-reader');

            expect(reader1).toBe(reader2);
        });

        it('should verify entry properties', async () => {
            if (!connectionString) return;

            const streamName = `props-${Date.now()}-${uuid().slice(0, 8)}`;
            const event = new AccountOpened('props-1', 'Properties', 500);

            await journal.append(streamName, 1, event, Metadata.withOperation('create'));

            const reader = await journal.streamReader('props-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.entries.length).toBe(1);
            const entry = stream.entries[0];

            expect(entry.id).toBeDefined();
            expect(entry.type).toBe('AccountOpened');
            expect(entry.typeVersion).toBe(1);
            expect(entry.entryData).toBeDefined();
            expect(entry.metadata).toBeDefined();

            // Verify entry data contains the event properties
            const data = JSON.parse(entry.entryData);
            expect(data.accountId).toBe('props-1');
            expect(data.name).toBe('Properties');
            expect(data.initialBalance).toBe(500);
        });
    });

    describe('journalReader', () => {
        it('should read entries from all streams', async () => {
            if (!connectionString) return;

            const streamA = `journal-reader-a-${Date.now()}-${uuid().slice(0, 8)}`;
            const streamB = `journal-reader-b-${Date.now()}-${uuid().slice(0, 8)}`;

            // Create events in multiple streams
            await journal.append(streamA, 1, new AccountOpened('jra', 'A', 100), Metadata.nullMetadata());
            await journal.append(streamB, 1, new AccountOpened('jrb', 'B', 200), Metadata.nullMetadata());
            await journal.append(streamA, 2, new FundsDeposited('jra', 50), Metadata.nullMetadata());

            // Get journal reader
            const reader = await journal.journalReader(`test-projection-${Date.now()}`);

            // Read entries
            const entries = await reader.readNext(100);

            // Should have at least our 3 events (may include events from other tests)
            expect(entries.length).toBeGreaterThanOrEqual(3);
        });

        it('should track position', async () => {
            if (!connectionString) return;

            const reader = await journal.journalReader(`position-test-${Date.now()}`);

            // Initial position should be 0
            const initialPos = await reader.position();
            expect(initialPos).toBe(0);

            // Read some entries
            const entries = await reader.readNext(10);

            // Position should be updated
            const newPos = await reader.position();
            expect(newPos).toBe(entries.length);
        });

        it('should support rewind', async () => {
            if (!connectionString) return;

            const streamName = `rewind-${Date.now()}-${uuid().slice(0, 8)}`;
            await journal.append(streamName, 1, new AccountOpened('rw', 'Rewind', 100), Metadata.nullMetadata());

            const reader = await journal.journalReader(`rewind-test-${Date.now()}`);

            // Read entries
            await reader.readNext(10);
            const pos1 = await reader.position();
            expect(pos1).toBeGreaterThan(0);

            // Rewind
            await reader.rewind();
            const pos2 = await reader.position();
            expect(pos2).toBe(0);
        });

        it('should support seek', async () => {
            if (!connectionString) return;

            const reader = await journal.journalReader(`seek-test-${Date.now()}`);

            // Seek to position 5
            await reader.seek(5);
            const pos = await reader.position();
            expect(pos).toBe(5);
        });

        it('should return reader name', async () => {
            if (!connectionString) return;

            const readerName = `named-reader-${Date.now()}`;
            const reader = await journal.journalReader(readerName);
            const name = await reader.name();

            expect(name).toBe(readerName);
        });

        it('should reuse the same reader instance', async () => {
            if (!connectionString) return;

            const readerName = `shared-journal-reader-${Date.now()}`;
            const reader1 = await journal.journalReader(readerName);
            const reader2 = await journal.journalReader(readerName);

            expect(reader1).toBe(reader2);
        });
    });

    describe('metadata preservation', () => {
        it('should preserve metadata through append and read', async () => {
            if (!connectionString) return;

            const streamName = `metadata-${Date.now()}-${uuid().slice(0, 8)}`;
            const metadata = Metadata.with(
                new Map([['correlationId', 'corr-123'], ['causationId', 'cause-456']]),
                'test-value',
                'create'
            );

            await journal.append(
                streamName,
                1,
                new AccountOpened('meta', 'Metadata', 100),
                metadata
            );

            const reader = await journal.streamReader('meta-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.entries.length).toBe(1);
            const entry = stream.entries[0];

            const entryMetadata = JSON.parse(entry.metadata);
            expect(entryMetadata.operation).toBe('create');
            expect(entryMetadata.value).toBe('test-value');
        });
    });
});
