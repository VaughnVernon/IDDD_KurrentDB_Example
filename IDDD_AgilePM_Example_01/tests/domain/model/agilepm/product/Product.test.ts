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
import { Product } from '../../../../../src/domain/model/agilepm/product/Product';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { ProductOwnerId } from '../../../../../src/domain/model/agilepm/team/ProductOwnerId';
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { Sprint } from '../../../../../src/domain/model/agilepm/sprint/Sprint';
import { SprintId } from '../../../../../src/domain/model/agilepm/sprint/SprintId';
import { Release } from '../../../../../src/domain/model/agilepm/release/Release';
import { ReleaseId } from '../../../../../src/domain/model/agilepm/release/ReleaseId';
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

describe('Product', () => {
    let journal: Journal<string>;
    let tenant: Tenant;
    let productId: ProductId;

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
    });

    /**
     * Helper to create a product actor for testing.
     */
    async function newProduct(): Promise<Product> {
        return Product.initiate(tenant, productId, 'My Product', 'A description of my product', ProductOwnerId.of(tenant.id, 'owner-123'));
    }

    describe('define', () => {
        it('should apply ProductInitiated event with correct properties', async () => {
            // Given: a new product actor
            const product = await newProduct();

            // When: product is defined
            await product.initiate('My Product', 'A description of my product', ProductOwnerId.of(tenant.id, 'owner-123'));

            // Then: ProductInitiated event is persisted with correct properties
            const events = await readEvents(journal, Product.streamNameFor(tenant, productId));
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.name).toBe('My Product');
            expect(event.description).toBe('A description of my product');
            expect(event.productOwnerId).toBe(`${tenant.id}:owner-123`);
        });

        it('should throw error when name is empty', async () => {
            // When: creating a product with empty name
            // Then: an error is thrown
            await expect(Product.initiate(
                tenant,
                productId,
                '',
                'Description',
                ProductOwnerId.of(tenant.id, 'owner-123')
            )).rejects.toThrow('Product name cannot be empty');
        });

        it('should throw error when product owner ID is empty', () => {
            // When: creating a ProductOwnerId with empty ID
            // Then: an error is thrown
            expect(() => ProductOwnerId.of(tenant.id, '')).toThrow('ProductOwner ID cannot be empty');
        });
    });

    describe('changeDescription', () => {
        it('should apply ProductDescriptionChanged event with new description', async () => {
            // Given: a product exists
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Original description', ProductOwnerId.of(tenant.id, 'owner-123'));

            // When: description is changed
            await product.changeDescription('Updated description');

            // Then: ProductDescriptionChanged event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ProductInitiated, ProductDescriptionChanged
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.description).toBe('Updated description');
        });
    });

    describe('discussion', () => {
        it('should apply ProductDiscussionRequested event', async () => {
            // Given: a product exists without a discussion
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            // When: discussion is requested
            await product.requestDiscussion();

            // Then: ProductDiscussionRequested event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ProductInitiated, ProductDiscussionRequested
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
        });

        it('should throw error when discussion already requested', async () => {
            // Given: a product with discussion already requested
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();

            // When: requesting discussion again
            // Then: an error is thrown
            await expect(product.requestDiscussion()).rejects.toThrow('Discussion already requested');
        });

        it('should apply ProductDiscussionAttached event', async () => {
            // Given: a product with discussion requested
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();

            // When: discussion is initiated
            await product.attachDiscussion('discussion-123');

            // Then: ProductDiscussionAttached event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ProductInitiated, ProductDiscussionRequested, ProductDiscussionAttached
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.discussionId).toBe('discussion-123');
        });

        it('should be idempotent when discussion already initiated', async () => {
            // Given: a product with discussion already initiated
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();
            await product.attachDiscussion('discussion-123');

            // When: initiating another discussion
            await product.attachDiscussion('discussion-456');

            // Then: no additional event is applied
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);
            expect(events[2].discussionId).toBe('discussion-123');
        });

        it('should throw error when requesting discussion after one is already attached', async () => {
            // Given: a product with discussion already attached
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();
            await product.attachDiscussion('discussion-123');

            // When: requesting a discussion
            // Then: an error is thrown
            await expect(product.requestDiscussion()).rejects.toThrow('Discussion already attached');
        });

        it('should apply ProductDiscussionAttached event', async () => {
            // Given: a product with discussion requested
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();

            // When: discussion is initiated (saga callback)
            await product.attachDiscussion('discussion-123');

            // Then: ProductDiscussionAttached event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ProductInitiated, ProductDiscussionRequested, ProductDiscussionAttached
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.discussionId).toBe('discussion-123');
        });

        it('should not apply event when discussion already initiated', async () => {
            // Given: a product with discussion already initiated
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();
            await product.attachDiscussion('discussion-123');

            // When: trying to initiate again
            await product.attachDiscussion('discussion-456');

            // Then: no new event is applied
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);
        });

        it('should apply ProductDiscussionRequestTimedOut event', async () => {
            // Given: a product with discussion requested
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();

            // When: discussion request times out (saga callback)
            await product.timeOutDiscussionRequest();

            // Then: ProductDiscussionRequestTimedOut event is persisted
            const events = await readEvents(journal, streamName);
            // Events: ProductInitiated, ProductDiscussionRequested, ProductDiscussionRequestTimedOut
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(typeof event.timedOutOn).toBe('string'); // Date serialized as ISO string
        });

        it('should not apply timeout event when no discussion requested', async () => {
            // Given: a product without discussion requested
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            // When: trying to time out
            await product.timeOutDiscussionRequest();

            // Then: no event is applied
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
        });

        it('should not apply timeout event when discussion already received', async () => {
            // Given: a product with discussion already initiated
            const streamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));
            await product.requestDiscussion();
            await product.attachDiscussion('discussion-123');

            // When: trying to time out
            await product.timeOutDiscussionRequest();

            // Then: no new event is applied
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);
        });
    });

    describe('planSprint', () => {
        it('should delegate to Sprint.plan() and create Sprint aggregate', async () => {
            // Given: a product exists
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const sprintId = SprintId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-01-14');

            // When: a sprint is planned via Product
            await product.planSprint(sprintId, 'Sprint 1', 'Sprint goals', begins, ends);

            // Then: SprintPlanned event is persisted on the Sprint stream
            const sprintStreamName = Sprint.streamNameFor(tenant, sprintId);
            const events = await readEvents(journal, sprintStreamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.sprintId).toBe(sprintId.id);
            expect(event.name).toBe('Sprint 1');
            expect(event.goals).toBe('Sprint goals');
        });

        it('should not add events to the Product stream', async () => {
            // Given: a product exists
            const productStreamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const sprintId = SprintId.generate();

            // When: a sprint is planned via Product
            await product.planSprint(sprintId, 'Sprint 1', 'Goals', new Date('2024-01-01'), new Date('2024-01-14'));

            // Then: Product stream only has the initiation event
            const events = await readEvents(journal, productStreamName);
            expect(events).toHaveLength(1);
        });

        it('should throw error when sprint name is empty', async () => {
            // Given: a product exists
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const sprintId = SprintId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-01-14');

            // When: planning a sprint with empty name
            // Then: an error is thrown
            await expect(product.planSprint(sprintId, '', 'Goals', begins, ends))
                .rejects.toThrow('Sprint name cannot be empty');
        });

        it('should throw error when begin date is after end date', async () => {
            // Given: a product exists
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const sprintId = SprintId.generate();
            const begins = new Date('2024-01-14');
            const ends = new Date('2024-01-01');

            // When: planning a sprint with invalid dates
            // Then: an error is thrown
            await expect(product.planSprint(sprintId, 'Sprint 1', 'Goals', begins, ends))
                .rejects.toThrow('Sprint begin date must be before end date');
        });
    });

    describe('scheduleRelease', () => {
        it('should delegate to Release.schedule() and create Release aggregate', async () => {
            // Given: a product exists
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const releaseId = ReleaseId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-03-31');

            // When: a release is scheduled via Product
            await product.scheduleRelease(releaseId, 'Release 1.0', 'Major release', begins, ends);

            // Then: ReleaseScheduled event is persisted on the Release stream
            const releaseStreamName = Release.streamNameFor(tenant, releaseId);
            const events = await readEvents(journal, releaseStreamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.releaseId).toBe(releaseId.id);
            expect(event.name).toBe('Release 1.0');
            expect(event.description).toBe('Major release');
        });

        it('should not add events to the Product stream', async () => {
            // Given: a product exists
            const productStreamName = Product.streamNameFor(tenant, productId);
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const releaseId = ReleaseId.generate();

            // When: a release is scheduled via Product
            await product.scheduleRelease(releaseId, 'Release 1.0', 'Major release', new Date('2024-01-01'), new Date('2024-03-31'));

            // Then: Product stream only has the initiation event
            const events = await readEvents(journal, productStreamName);
            expect(events).toHaveLength(1);
        });

        it('should throw error when release name is empty', async () => {
            // Given: a product exists
            const product = await newProduct();
            await product.initiate('My Product', 'Description', ProductOwnerId.of(tenant.id, 'owner-123'));

            const releaseId = ReleaseId.generate();
            const begins = new Date('2024-01-01');
            const ends = new Date('2024-03-31');

            // When: scheduling a release with empty name
            // Then: an error is thrown
            await expect(product.scheduleRelease(releaseId, '', 'Description', begins, ends))
                .rejects.toThrow('Release name cannot be empty');
        });
    });

    describe('Product.streamNameFor', () => {
        it('should generate correct stream name', () => {
            // When: generating stream name
            const streamName = Product.streamNameFor(tenant, productId);

            // Then: stream name follows the convention
            const expectedStreamName = `Product-${tenant.id}-${productId.id}`;
            expect(streamName).toBe(expectedStreamName);
        });
    });
});
