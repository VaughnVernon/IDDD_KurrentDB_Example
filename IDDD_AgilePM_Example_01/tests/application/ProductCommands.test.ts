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

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { stage, type Protocol } from 'domo-actors';
import { InMemoryJournal, type Journal } from 'domo-tactical';
import { TestJournalSupervisor, type TestSupervisor } from 'domo-tactical/testkit';
import { ProductCommands } from '../../src/application/ProductCommands';
import { registerAgilePMEventAdapters } from '../../src/infrastructure/persistence/EventAdapterRegistration';

const JOURNAL_KEY = 'domo-tactical:default.journal';
const SUPERVISOR_NAME = 'test-supervisor';

const supervisorProtocol: Protocol = {
    type: () => SUPERVISOR_NAME,
    instantiator: () => ({
        instantiate: () => new TestJournalSupervisor()
    })
};

const journalProtocol: Protocol = {
    type: () => 'InMemoryJournal',
    instantiator: () => ({
        instantiate: () => new InMemoryJournal<string>()
    })
};

async function readEvents(journal: Journal<string>, streamName: string): Promise<any[]> {
    const reader = await journal.streamReader('test-reader');
    const stream = await reader.streamFor(streamName);
    return stream.entries.map(entry => JSON.parse(entry.entryData));
}

describe('ProductCommands', () => {
    let journal: Journal<string>;
    let commands: ProductCommands;
    let tenantId: string;

    beforeAll(() => {
        registerAgilePMEventAdapters();
        stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default');
        journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME);
        stage().registerValue(JOURNAL_KEY, journal);
    });

    afterAll(async () => {
        await stage().close();
    });

    beforeEach(() => {
        commands = new ProductCommands();
        tenantId = `tenant-${Date.now()}-${Math.random()}`;
    });

    describe('initiateProduct', () => {
        it('should create a product and return the generated ID', async () => {
            const productId = await commands.initiateProduct(
                tenantId,
                'My Product',
                'A great product',
                'owner-123'
            );

            expect(productId).toBeDefined();
            expect(typeof productId).toBe('string');

            const streamName = `Product-${tenantId}-${productId}`;
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
            expect(events[0].name).toBe('My Product');
        });

        it('should generate unique IDs for each product', async () => {
            const id1 = await commands.initiateProduct(tenantId, 'Product 1', 'Desc', 'owner-1');
            const id2 = await commands.initiateProduct(tenantId, 'Product 2', 'Desc', 'owner-1');

            expect(id1).not.toBe(id2);
        });
    });

    describe('planSprint', () => {
        it('should return a generated sprint ID', async () => {
            const productId = await commands.initiateProduct(
                tenantId,
                'My Product',
                'Description',
                'owner-123'
            );

            const sprintId = await commands.planSprint(
                tenantId,
                productId,
                'Sprint 1',
                'Complete feature X',
                new Date('2024-01-01'),
                new Date('2024-01-14')
            );

            expect(sprintId).toBeDefined();
            expect(typeof sprintId).toBe('string');
            expect(sprintId.length).toBeGreaterThan(0);
        });
    });

    describe('scheduleRelease', () => {
        it('should return a generated release ID', async () => {
            const productId = await commands.initiateProduct(
                tenantId,
                'My Product',
                'Description',
                'owner-123'
            );

            const releaseId = await commands.scheduleRelease(
                tenantId,
                productId,
                'Release 1.0',
                'Major release',
                new Date('2024-01-01'),
                new Date('2024-03-31')
            );

            expect(releaseId).toBeDefined();
            expect(typeof releaseId).toBe('string');
            expect(releaseId.length).toBeGreaterThan(0);
        });
    });
});
