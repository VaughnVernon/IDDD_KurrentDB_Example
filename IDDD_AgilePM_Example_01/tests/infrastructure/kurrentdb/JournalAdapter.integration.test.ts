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

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { stage, type Protocol, type Stage } from 'domo-actors';
import type { Journal } from 'domo-tactical';
import { TestJournalSupervisor, type TestSupervisor } from 'domo-tactical/testkit';
import {
    kurrentInstance,
    journalAdapter,
    type KurrentDB
} from '../../../src/infrastructure/kurrentdb';
import { Product } from '../../../src/domain/model/agilepm/product/Product';
import { ProductId } from '../../../src/domain/model/agilepm/product/ProductId';
import { ProductOwnerId } from '../../../src/domain/model/agilepm/team/ProductOwnerId';
import { Tenant } from '../../../src/domain/model/agilepm/tenant/Tenant';
import { Sprint } from '../../../src/domain/model/agilepm/sprint/Sprint';
import { SprintId } from '../../../src/domain/model/agilepm/sprint/SprintId';
import { Release } from '../../../src/domain/model/agilepm/release/Release';
import { ReleaseId } from '../../../src/domain/model/agilepm/release/ReleaseId';
import { registerAgilePMEventAdapters } from '../../../src/infrastructure/persistence/EventAdapterRegistration';
import { v4 as uuid } from 'uuid';

// Journal key used by domo-tactical - must match contextName() default of 'default'
const JOURNAL_KEY = 'domo-tactical:default.journal';
const SUPERVISOR_NAME = 'kurrentdb-test-supervisor';

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
 * JournalAdapter integration tests with EventSourcedEntity.
 *
 * These tests verify that EventSourcedEntity (Product) works correctly
 * with JournalAdapter backed by real KurrentDB.
 *
 * To run:
 * 1. Start KurrentDB: docker compose up -d
 * 2. Set environment variable: TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false
 * 3. Run tests: npm test -- tests/infrastructure/kurrentdb/JournalAdapter.integration.test.ts
 */
describe('JournalAdapter with EventSourcedEntity', () => {
    let testStage: Stage;
    let kurrentDB: KurrentDB;
    let journal: Journal<string>;
    let connectionString: string | undefined;
    let tenant: Tenant;
    let productId: ProductId;

    beforeAll(async () => {
        connectionString = process.env.TEST_KURRENTDB_URL;

        if (!connectionString) {
            console.log('Skipping JournalAdapter integration tests - TEST_KURRENTDB_URL not set');
            console.log('To run: docker compose up -d && TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false npm test');
            return;
        }

        // Register event adapters for proper deserialization
        registerAgilePMEventAdapters();

        // Get stage
        testStage = stage();

        // Create supervisor under the default supervisor
        testStage.actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default');

        // Create KurrentDB instance
        kurrentDB = kurrentInstance(connectionString, SUPERVISOR_NAME);

        // Create JournalAdapter wrapping KurrentDB
        journal = journalAdapter(kurrentDB, SUPERVISOR_NAME);

        // Register journal with the Stage so EventSourcedEntity actors can access it
        testStage.registerValue(JOURNAL_KEY, journal);
    });

    afterAll(async () => {
        if (testStage) {
            await testStage.close();
        }
    });

    beforeEach(() => {
        // Use unique tenant and product for each test to avoid conflicts
        tenant = Tenant.of(`tenant-${Date.now()}-${uuid().slice(0, 8)}`);
        productId = ProductId.of(`product-${Date.now()}-${uuid().slice(0, 8)}`);
    });

    /**
     * Helper to read events from journal for a stream.
     */
    async function readEvents(streamName: string): Promise<any[]> {
        const reader = await journal.streamReader('test-reader');
        const stream = await reader.streamFor(streamName);
        return stream.entries.map(entry => JSON.parse(entry.entryData));
    }

    describe('Product lifecycle', () => {
        it('should persist ProductInitiated event to KurrentDB', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // When: Product is initiated
            await Product.initiate(
                tenant,
                productId,
                'KurrentDB Test Product',
                'A product for testing KurrentDB integration',
                ProductOwnerId.of(tenant.id, 'owner-123'),
            );

            // Then: ProductInitiated event is persisted to KurrentDB
            const events = await readEvents(streamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.name).toBe('KurrentDB Test Product');
            expect(event.description).toBe('A product for testing KurrentDB integration');
            expect(event.productOwnerId).toBe(ProductOwnerId.of(tenant.id, 'owner-123').toString());
        });

        it('should persist multiple events in sequence', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product is initiated
            const product = await Product.initiate(
                tenant,
                productId,
                'Multi-Event Product',
                'Original description',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            // When: Multiple commands are executed
            await product.changeDescription('Updated description');
            await product.changeProductOwner(ProductOwnerId.of(tenant.id, 'owner-2'));
            await product.requestDiscussion();

            // Then: All events are persisted in order
            const events = await readEvents(streamName);
            expect(events).toHaveLength(4);

            expect(events[0].name).toBe('Multi-Event Product');
            expect(events[1].description).toBe('Updated description');
            expect(events[2].productOwnerId).toBe(ProductOwnerId.of(tenant.id, 'owner-2').toString());
            expect(events[3].tenantId).toBe(tenant.id); // DiscussionRequested
        });

        it('should maintain correct stream version', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product is initiated with multiple events
            const product = await Product.initiate(
                tenant,
                productId,
                'Version Test Product',
                'Description',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            await product.changeDescription('Desc 1');
            await product.changeDescription('Desc 2');
            await product.changeDescription('Desc 3');

            // Then: Stream version matches event count
            const reader = await journal.streamReader('version-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.streamVersion).toBe(4); // 4 events total
            expect(stream.entries.length).toBe(4);
        });

        it('should plan sprint via Product aggregate', async () => {
            if (!connectionString) return;

            // Given: Product is initiated
            const product = await Product.initiate(
                tenant,
                productId,
                'Sprint Test Product',
                'For sprint testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            const sprintId = SprintId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-01-14');

            // When: Sprint is planned via Product
            await product.planSprint(sprintId, 'Sprint 1', 'Sprint goals', begins, ends);

            // Then: SprintPlanned event is persisted on the Sprint stream
            const sprintStreamName = Sprint.streamNameFor(tenant, sprintId);
            const events = await readEvents(sprintStreamName);
            expect(events).toHaveLength(1);

            const sprintEvent = events[0];
            expect(sprintEvent.sprintId).toBe(sprintId.id);
            expect(sprintEvent.name).toBe('Sprint 1');
            expect(sprintEvent.goals).toBe('Sprint goals');
        });

        it('should schedule release via Product aggregate', async () => {
            if (!connectionString) return;

            // Given: Product is initiated
            const product = await Product.initiate(
                tenant,
                productId,
                'Release Test Product',
                'For release testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            const releaseId = ReleaseId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-03-31');

            // When: Release is scheduled via Product
            await product.scheduleRelease(releaseId, 'Release 1.0', 'Major release', begins, ends);

            // Then: ReleaseScheduled event is persisted on the Release stream
            const releaseStreamName = Release.streamNameFor(tenant, releaseId);
            const events = await readEvents(releaseStreamName);
            expect(events).toHaveLength(1);

            const releaseEvent = events[0];
            expect(releaseEvent.releaseId).toBe(releaseId.id);
            expect(releaseEvent.name).toBe('Release 1.0');
            expect(releaseEvent.description).toBe('Major release');
        });

        it('should initiate discussion to product', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product with discussion requested
            const product = await Product.initiate(
                tenant,
                productId,
                'Discussion Test Product',
                'For discussion testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );
            await product.requestDiscussion();

            // When: Discussion is initiated
            await product.attachDiscussion('discussion-xyz');

            // Then: ProductDiscussionAttached event is persisted
            const events = await readEvents(streamName);
            expect(events).toHaveLength(3);

            const attachEvent = events[2];
            expect(attachEvent.discussionId).toBe('discussion-xyz');
        });
    });

    describe('event entry properties', () => {
        it('should have correct entry metadata', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product is initiated
            await Product.initiate(
                tenant,
                productId,
                'Entry Test Product',
                'For entry testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            // Then: Entry has proper structure
            const reader = await journal.streamReader('entry-reader');
            const stream = await reader.streamFor(streamName);

            expect(stream.entries.length).toBe(1);
            const entry = stream.entries[0];

            expect(entry.id).toBeDefined();
            expect(entry.type).toBe('ProductInitiated');
            expect(entry.typeVersion).toBe(1);
            expect(entry.entryData).toBeDefined();
            expect(entry.metadata).toBeDefined();
        });
    });

    describe('validation', () => {
        it('should throw error when product name is empty', async () => {
            if (!connectionString) return;

            // When: Creating product with empty name
            // Then: Error is thrown
            await expect(Product.initiate(
                tenant,
                productId,
                '',
                'Description',
                ProductOwnerId.of(tenant.id, 'owner-123')
            )).rejects.toThrow('Product name cannot be empty');
        });

        it('should throw error for invalid sprint dates', async () => {
            if (!connectionString) return;

            // Given: Product is initiated
            const product = await Product.initiate(
                tenant,
                productId,
                'Validation Test Product',
                'For validation testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            const sprintId = SprintId.generate();
            const begins = new Date('2024-01-14');
            const ends = new Date('2024-01-01'); // Before begins

            // When: Scheduling sprint with invalid dates
            // Then: Error is thrown
            await expect(product.planSprint(sprintId, 'Sprint 1', 'Goals', begins, ends))
                .rejects.toThrow('Sprint begin date must be before end date');
        });

        it('should throw error when discussion already requested', async () => {
            if (!connectionString) return;

            // Given: Product with discussion already requested
            const product = await Product.initiate(
                tenant,
                productId,
                'Discussion Validation Product',
                'For discussion validation',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );
            await product.requestDiscussion();

            // When: Requesting discussion again
            // Then: Error is thrown
            await expect(product.requestDiscussion())
                .rejects.toThrow('Discussion already requested');
        });
    });

    describe('KurrentDB direct verification', () => {
        it('should read events directly from KurrentDB', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product is initiated
            await Product.initiate(
                tenant,
                productId,
                'Direct Read Product',
                'For direct read testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            // Then: Events can be read directly from KurrentDB
            const events = await kurrentDB.readStream(streamName);

            expect(events.length).toBe(1);
            expect(events[0].type).toBe('ProductInitiated');
            expect(events[0].streamId).toBe(streamName);
        });

        it('should verify stream revision in KurrentDB', async () => {
            if (!connectionString) return;

            const streamName = Product.streamNameFor(tenant, productId);

            // Given: Product with multiple events
            const product = await Product.initiate(
                tenant,
                productId,
                'Revision Test Product',
                'For revision testing',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );
            await product.changeDescription('Updated');
            await product.requestDiscussion();

            // Then: KurrentDB revision matches
            const revision = await kurrentDB.getStreamRevision(streamName);
            expect(revision).toBe(2n); // 3 events = revision 2 (0-based)
        });
    });

    describe('concurrent operations', () => {
        it('should handle multiple products independently', async () => {
            if (!connectionString) return;

            const tenant2 = Tenant.of(`tenant-2-${Date.now()}-${uuid().slice(0, 8)}`);
            const productId2 = ProductId.of(`product-2-${Date.now()}-${uuid().slice(0, 8)}`);

            // Given: Two products created
            const product1 = await Product.initiate(
                tenant,
                productId,
                'Product 1',
                'First product',
                ProductOwnerId.of(tenant.id, 'owner-1')
            );

            const product2 = await Product.initiate(
                tenant2,
                productId2,
                'Product 2',
                'Second product',
                ProductOwnerId.of(tenant.id, 'owner-2')
            );

            // When: Both products have events
            await product1.changeDescription('Product 1 updated');
            await product2.changeDescription('Product 2 updated');

            // Then: Each stream has correct events
            const events1 = await readEvents(Product.streamNameFor(tenant, productId));
            const events2 = await readEvents(Product.streamNameFor(tenant2, productId2));

            expect(events1).toHaveLength(2);
            expect(events2).toHaveLength(2);

            expect(events1[0].name).toBe('Product 1');
            expect(events2[0].name).toBe('Product 2');
        });
    });
});
