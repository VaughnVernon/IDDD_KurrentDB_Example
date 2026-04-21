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
import { type Sprint, Sprint } from '../../../../../src/domain/model/agilepm/sprint/Sprint';
import { SprintId } from '../../../../../src/domain/model/agilepm/sprint/SprintId';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { BacklogItemId } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemId';
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { registerAgilePMEventAdapters } from '../../../../../src/infrastructure/persistence/EventAdapterRegistration';

// Journal key used by domo-tactical - must match contextName() default of 'default'
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

describe('Sprint', () => {
    let journal: Journal<string>;
    let tenant: Tenant;
    let productId: ProductId;
    let sprintId: SprintId;

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
        tenant = Tenant.unique();
        productId = ProductId.unique();
        sprintId = SprintId.unique();
    });

    async function newSprint(): Promise<Sprint> {
        const begins = new Date('2024-01-01');
        const ends = new Date('2024-01-14');
        return Sprint.plan(tenant, productId, sprintId, 'Sprint 1', 'Complete user authentication', begins, ends);
    }

    describe('plan', () => {
        it('should apply SprintPlanned event with correct properties', async () => {
            await newSprint();
            const streamName = Sprint.streamNameFor(tenant, sprintId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.sprintId).toBe(sprintId.id);
            expect(event.name).toBe('Sprint 1');
            expect(event.goals).toBe('Complete user authentication');
        });

        it('should throw error when name is empty', async () => {
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-01-14');

            await expect(async () => Sprint.plan(tenant, productId, sprintId, '', 'Goals', begins, ends))
                .rejects.toThrow('Sprint name cannot be empty');
        });

        it('should throw error when begin date is after end date', async () => {
            const begins = new Date('2024-01-14');
            const ends = new Date('2024-01-01');

            await expect(async () => Sprint.plan(tenant, productId, sprintId, 'Sprint 1', 'Goals', begins, ends))
                .rejects.toThrow('Sprint begin date must be before end date');
        });

        it('should throw error when begin and end dates are equal', async () => {
            const date = new Date('2024-01-01');

            await expect(async () => Sprint.plan(tenant, productId, sprintId, 'Sprint 1', 'Goals', date, date))
                .rejects.toThrow('Sprint begin date must be before end date');
        });
    });

    describe('commit', () => {
        it('should apply SprintBacklogItemCommitted event with correct properties', async () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const sprint = await newSprint();

            const backlogItemId = BacklogItemId.unique();
            await sprint.commit(backlogItemId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.sprintId).toBe(sprintId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.ordering).toBe(0);
        });

        it('should assign correct ordering for multiple committed items', async () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const sprint = await newSprint();

            const backlogItemId1 = BacklogItemId.unique();
            await sprint.commit(backlogItemId1);

            const backlogItemId2 = BacklogItemId.unique();
            await sprint.commit(backlogItemId2);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.ordering).toBe(1);
        });

        it('should throw error when backlog item already committed', async () => {
            const sprint = await newSprint();

            const backlogItemId = BacklogItemId.unique();
            await sprint.commit(backlogItemId);

            await expect(sprint.commit(backlogItemId))
                .rejects.toThrow('Backlog item already committed to this sprint');
        });
    });

    describe('uncommit', () => {
        it('should apply SprintBacklogItemUncommitted event with correct properties', async () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const sprint = await newSprint();

            const backlogItemId = BacklogItemId.unique();
            await sprint.commit(backlogItemId);
            await sprint.uncommit(backlogItemId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.sprintId).toBe(sprintId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
        });

        it('should throw error when backlog item not committed', async () => {
            const sprint = await newSprint();

            const backlogItemId = BacklogItemId.unique();

            await expect(sprint.uncommit(backlogItemId))
                .rejects.toThrow('Backlog item not committed to this sprint');
        });
    });

    describe('recordRetrospective', () => {
        it('should apply SprintRetrospectiveRecorded event with correct properties', async () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const sprint = await newSprint();

            await sprint.recordRetrospective('We improved velocity by 20%');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.sprintId).toBe(sprintId.id);
            expect(event.retrospective).toBe('We improved velocity by 20%');
        });

        it('should trim whitespace from results', async () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const sprint = await newSprint();

            await sprint.recordRetrospective('  Retrospective results  ');

            const events = await readEvents(journal, streamName);
            const event = events[1];
            expect(event.retrospective).toBe('Retrospective results');
        });

        it('should throw error when results are empty', async () => {
            const sprint = await newSprint();

            await expect(sprint.recordRetrospective(''))
                .rejects.toThrow('Retrospective results cannot be empty');
        });

        it('should throw error when results are only whitespace', async () => {
            const sprint = await newSprint();

            await expect(sprint.recordRetrospective('   '))
                .rejects.toThrow('Retrospective results cannot be empty');
        });
    });

    describe('Sprint.streamNameFor', () => {
        it('should generate correct stream name', () => {
            const streamName = Sprint.streamNameFor(tenant, sprintId);
            const expectedStreamName = `Sprint-${tenant.id}-${sprintId.id}`;
            expect(streamName).toBe(expectedStreamName);
        });
    });
});
