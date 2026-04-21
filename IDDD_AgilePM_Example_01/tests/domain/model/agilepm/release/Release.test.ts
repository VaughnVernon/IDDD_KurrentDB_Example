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
import { type Release, Release } from '../../../../../src/domain/model/agilepm/release/Release';
import { ReleaseId } from '../../../../../src/domain/model/agilepm/release/ReleaseId';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { BacklogItemId } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemId';
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { registerAgilePMEventAdapters } from '../../../../../src/infrastructure/persistence/EventAdapterRegistration';

// Journal key used by domo-tactical - must match contextName() default of 'default'
const JOURNAL_KEY = 'domo-tactical:default.journal';
const SUPERVISOR_NAME = 'test-supervisor';

/**
 * Protocol for creating TestJournalSupervisor.
 */
const supervisorProtocol: Protocol = {
    type: () => SUPERVISOR_NAME,
    instantiator: () => ({
        instantiate: () => new TestJournalSupervisor()
    })
};

/**
 * Protocol for creating InMemoryJournal as an actor.
 */
const journalProtocol: Protocol = {
    type: () => 'InMemoryJournal',
    instantiator: () => ({
        instantiate: () => new InMemoryJournal<string>()
    })
};

/**
 * Helper to read events from journal for a stream.
 */
async function readEvents(journal: Journal<string>, streamName: string): Promise<any[]> {
    const reader = await journal.streamReader('test-reader');
    const stream = await reader.streamFor(streamName);
    return stream.entries.map(entry => JSON.parse(entry.entryData));
}

describe('Release', () => {
    let journal: Journal<string>;
    let tenant: Tenant;
    let productId: ProductId;
    let releaseId: ReleaseId;

    // Start Stage and create actors before all tests
    beforeAll(() => {
        // Register event adapters for proper deserialization
        registerAgilePMEventAdapters();

        // Create supervisor first under the default supervisor
        stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default');

        // Create journal under our test supervisor
        journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME);

        // Register journal with the Stage so actors can access it
        stage().registerValue(JOURNAL_KEY, journal);
    });

    // Close Stage after all tests
    afterAll(async () => {
        await stage().close();
    });

    beforeEach(() => {
        tenant = Tenant.unique();
        productId = ProductId.unique();
        releaseId = ReleaseId.generate();
    });

    /**
     * Helper to create a release actor for testing.
     */
    async function newRelease(): Promise<Release> {
        const begins = new Date('2024-01-01');
        const ends = new Date('2024-03-31');
        return Release.schedule(tenant, productId, releaseId, 'Release 1.0', 'Major feature release', begins, ends);
    }

    describe('plan', () => {
        it('should apply ReleaseScheduled event with correct properties', async () => {
            // Given/When: a new release is planned
            await newRelease();
            const streamName = Release.streamNameFor(tenant, releaseId);

            // Then: ReleaseScheduled event is persisted with correct properties
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.releaseId).toBe(releaseId.id);
            expect(event.name).toBe('Release 1.0');
            expect(event.description).toBe('Major feature release');
        });

        it('should throw error when name is empty', async () => {
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-03-31');

            await expect(async () => Release.schedule(tenant, productId, releaseId, '', 'Description', begins, ends))
                .rejects.toThrow('Release name cannot be empty');
        });

        it('should throw error when begin date is after end date', async () => {
            const begins = new Date('2024-03-31');
            const ends = new Date('2024-01-01');

            await expect(async () => Release.schedule(tenant, productId, releaseId, 'Release 1.0', 'Description', begins, ends))
                .rejects.toThrow('Release begin date must be before end date');
        });
    });

    describe('archive', () => {
        it('should apply ReleaseArchived event with correct properties', async () => {
            // Given: an active release exists
            const streamName = Release.streamNameFor(tenant, releaseId);
            const release = await newRelease();

            // When: the release is archived
            await release.archive();

            // Then: ReleaseArchived event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ReleaseScheduled, ReleaseArchived
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.releaseId).toBe(releaseId.id);
        });

        it('should throw error when release already archived', async () => {
            // Given: an archived release
            const release = await newRelease();
            await release.archive();

            // When: archiving again
            // Then: an error is thrown
            await expect(release.archive())
                .rejects.toThrow('Release is already archived');
        });
    });

    describe('schedule', () => {
        it('should apply ReleaseBacklogItemScheduled event with correct properties', async () => {
            // Given: an active release exists
            const streamName = Release.streamNameFor(tenant, releaseId);
            const release = await newRelease();

            const backlogItemId = BacklogItemId.generate();

            // When: a backlog item is scheduled
            await release.scheduleBacklogItem(backlogItemId);

            // Then: ReleaseBacklogItemScheduled event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ReleaseScheduled, ReleaseBacklogItemScheduled
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.releaseId).toBe(releaseId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.ordering).toBe(0);
        });

        it('should assign correct ordering for multiple scheduled items', async () => {
            // Given: a release with one scheduled item
            const streamName = Release.streamNameFor(tenant, releaseId);
            const release = await newRelease();

            const backlogItemId1 = BacklogItemId.generate();
            await release.scheduleBacklogItem(backlogItemId1);

            const backlogItemId2 = BacklogItemId.generate();

            // When: a second backlog item is scheduled
            await release.scheduleBacklogItem(backlogItemId2);

            // Then: the ordering is incremented
            const events = await readEvents(journal, streamName);
            // Events: ReleaseScheduled, ReleaseBacklogItemScheduled, ReleaseBacklogItemScheduled
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.ordering).toBe(1);
        });

        it('should throw error when release is archived', async () => {
            // Given: an archived release
            const release = await newRelease();
            await release.archive();

            const backlogItemId = BacklogItemId.generate();

            // When: scheduling an item for archived release
            // Then: an error is thrown
            await expect(release.scheduleBacklogItem(backlogItemId))
                .rejects.toThrow('Cannot schedule items for an archived release');
        });

        it('should throw error when backlog item already scheduled', async () => {
            // Given: a release with a scheduled item
            const release = await newRelease();

            const backlogItemId = BacklogItemId.generate();
            await release.scheduleBacklogItem(backlogItemId);

            // When: scheduling the same item again
            // Then: an error is thrown
            await expect(release.scheduleBacklogItem(backlogItemId))
                .rejects.toThrow('Backlog item already scheduled for this release');
        });
    });

    describe('unschedule', () => {
        it('should apply ReleaseBacklogItemUnscheduled event with correct properties', async () => {
            // Given: a release with a scheduled item
            const streamName = Release.streamNameFor(tenant, releaseId);
            const release = await newRelease();

            const backlogItemId = BacklogItemId.generate();
            await release.scheduleBacklogItem(backlogItemId);

            // When: the backlog item is unscheduled
            await release.unscheduleBacklogItem(backlogItemId);

            // Then: ReleaseBacklogItemUnscheduled event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ReleaseScheduled, ReleaseBacklogItemScheduled, ReleaseBacklogItemUnscheduled
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.releaseId).toBe(releaseId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
        });

        it('should throw error when release is archived', async () => {
            // Given: an archived release with a scheduled item
            const release = await newRelease();

            const backlogItemId = BacklogItemId.generate();
            await release.scheduleBacklogItem(backlogItemId);
            await release.archive();

            // When: unscheduling from archived release
            // Then: an error is thrown
            await expect(release.unscheduleBacklogItem(backlogItemId))
                .rejects.toThrow('Cannot unschedule items from an archived release');
        });

        it('should throw error when backlog item not scheduled', async () => {
            // Given: a release without scheduled items
            const release = await newRelease();

            const backlogItemId = BacklogItemId.generate();

            // When: unscheduling a non-scheduled item
            // Then: an error is thrown
            await expect(release.unscheduleBacklogItem(backlogItemId))
                .rejects.toThrow('Backlog item not scheduled for this release');
        });
    });

    describe('Release.streamNameFor', () => {
        it('should generate correct stream name', () => {
            // When: generating stream name
            const streamName = Release.streamNameFor(tenant, releaseId);

            // Then: stream name follows the convention
            const expectedStreamName = `Release-${tenant.id}-${releaseId.id}`;
            expect(streamName).toBe(expectedStreamName);
        });
    });
});
