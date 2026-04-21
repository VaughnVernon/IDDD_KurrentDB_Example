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
import { BacklogItemCommands } from '../../src/application/BacklogItemCommands';
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

describe('BacklogItemCommands', () => {
    let journal: Journal<string>;
    let commands: BacklogItemCommands;
    let tenantId: string;
    let productId: string;

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
        commands = new BacklogItemCommands();
        tenantId = `tenant-${Date.now()}-${Math.random()}`;
        productId = `product-${Date.now()}-${Math.random()}`;
    });

    describe('planBacklogItem', () => {
        it('should create a backlog item and return the generated ID', async () => {
            const backlogItemId = await commands.planBacklogItem(
                tenantId,
                productId,
                'Implement login',
                'As a user, I want to log in',
                'Feature'
            );

            expect(backlogItemId).toBeDefined();
            expect(typeof backlogItemId).toBe('string');

            const streamName = `BacklogItem-${tenantId}-${backlogItemId}`;
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
            expect(events[0].summary).toBe('Implement login');
        });

        it('should generate unique IDs for each backlog item', async () => {
            const id1 = await commands.planBacklogItem(tenantId, productId, 'Item 1', 'Story', 'Feature');
            const id2 = await commands.planBacklogItem(tenantId, productId, 'Item 2', 'Story', 'Feature');

            expect(id1).not.toBe(id2);
        });
    });

    describe('defineTask', () => {
        it('should return a generated task ID', async () => {
            const backlogItemId = await commands.planBacklogItem(
                tenantId,
                productId,
                'Implement login',
                'Story',
                'Feature'
            );

            const taskId = await commands.defineTask(
                tenantId,
                productId,
                backlogItemId,
                'Create login form',
                'Build the HTML form'
            );

            expect(taskId).toBeDefined();
            expect(typeof taskId).toBe('string');
            expect(taskId.length).toBeGreaterThan(0);
        });
    });
});
