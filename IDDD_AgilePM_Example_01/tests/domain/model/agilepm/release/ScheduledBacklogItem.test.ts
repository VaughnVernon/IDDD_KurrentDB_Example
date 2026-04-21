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

import { describe, it, expect } from 'vitest';
import { ScheduledBacklogItem } from '../../../../../src/domain/model/agilepm/release/ScheduledBacklogItem';
import { BacklogItemId } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemId';

describe('ScheduledBacklogItem', () => {
    describe('constructor', () => {
        it('should create a scheduled backlog item with valid data', () => {
            const backlogItemId = BacklogItemId.unique();
            const ordering = 0;

            const scheduledItem = new ScheduledBacklogItem(backlogItemId, ordering);

            expect(scheduledItem.backlogItemId).toBe(backlogItemId);
            expect(scheduledItem.ordering).toBe(ordering);
        });

        it('should create a scheduled backlog item with ordering of zero', () => {
            const backlogItemId = BacklogItemId.unique();

            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 0);

            expect(scheduledItem.ordering).toBe(0);
        });

        it('should create a scheduled backlog item with positive ordering', () => {
            const backlogItemId = BacklogItemId.unique();

            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 10);

            expect(scheduledItem.ordering).toBe(10);
        });

        it('should create a scheduled backlog item with large ordering value', () => {
            const backlogItemId = BacklogItemId.unique();
            const largeOrdering = 999999;

            const scheduledItem = new ScheduledBacklogItem(backlogItemId, largeOrdering);

            expect(scheduledItem.ordering).toBe(largeOrdering);
        });

        it('should throw error when ordering is negative', () => {
            const backlogItemId = BacklogItemId.unique();

            expect(() => new ScheduledBacklogItem(backlogItemId, -1))
                .toThrow('Ordering must be non-negative');
        });

        it('should throw error when ordering is large negative value', () => {
            const backlogItemId = BacklogItemId.unique();

            expect(() => new ScheduledBacklogItem(backlogItemId, -100))
                .toThrow('Ordering must be non-negative');
        });
    });

    describe('backlogItemId getter', () => {
        it('should return the backlog item id', () => {
            const backlogItemId = BacklogItemId.unique();
            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 5);

            expect(scheduledItem.backlogItemId).toBe(backlogItemId);
            expect(scheduledItem.backlogItemId.id).toBe(backlogItemId.id);
        });
    });

    describe('ordering getter', () => {
        it('should return the ordering value', () => {
            const backlogItemId = BacklogItemId.unique();
            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 42);

            expect(scheduledItem.ordering).toBe(42);
        });
    });

    describe('equals', () => {
        it('should return true when backlog item ids are equal', () => {
            const backlogItemId = BacklogItemId.of('same-id');
            const item1 = new ScheduledBacklogItem(backlogItemId, 0);
            const item2 = new ScheduledBacklogItem(backlogItemId, 5);

            expect(item1.equals(item2)).toBe(true);
        });

        it('should return true when comparing items with same backlog item id but different instances', () => {
            const id = 'shared-id';
            const backlogItemId1 = BacklogItemId.of(id);
            const backlogItemId2 = BacklogItemId.of(id);
            const item1 = new ScheduledBacklogItem(backlogItemId1, 0);
            const item2 = new ScheduledBacklogItem(backlogItemId2, 10);

            expect(item1.equals(item2)).toBe(true);
        });

        it('should return false when backlog item ids are different', () => {
            const backlogItemId1 = BacklogItemId.unique();
            const backlogItemId2 = BacklogItemId.unique();
            const item1 = new ScheduledBacklogItem(backlogItemId1, 0);
            const item2 = new ScheduledBacklogItem(backlogItemId2, 0);

            expect(item1.equals(item2)).toBe(false);
        });

        it('should return false when other is null', () => {
            const backlogItemId = BacklogItemId.unique();
            const item = new ScheduledBacklogItem(backlogItemId, 0);

            expect(item.equals(null as unknown as ScheduledBacklogItem)).toBe(false);
        });

        it('should return false when other is undefined', () => {
            const backlogItemId = BacklogItemId.unique();
            const item = new ScheduledBacklogItem(backlogItemId, 0);

            expect(item.equals(undefined as unknown as ScheduledBacklogItem)).toBe(false);
        });

        it('should be reflexive - item equals itself', () => {
            const backlogItemId = BacklogItemId.unique();
            const item = new ScheduledBacklogItem(backlogItemId, 5);

            expect(item.equals(item)).toBe(true);
        });

        it('should be symmetric - if a equals b then b equals a', () => {
            const backlogItemId = BacklogItemId.of('test-id');
            const item1 = new ScheduledBacklogItem(backlogItemId, 1);
            const item2 = new ScheduledBacklogItem(backlogItemId, 2);

            expect(item1.equals(item2)).toBe(true);
            expect(item2.equals(item1)).toBe(true);
        });

        it('should be transitive - if a equals b and b equals c then a equals c', () => {
            const backlogItemId = BacklogItemId.of('transitive-id');
            const item1 = new ScheduledBacklogItem(backlogItemId, 1);
            const item2 = new ScheduledBacklogItem(backlogItemId, 2);
            const item3 = new ScheduledBacklogItem(backlogItemId, 3);

            expect(item1.equals(item2)).toBe(true);
            expect(item2.equals(item3)).toBe(true);
            expect(item1.equals(item3)).toBe(true);
        });

        it('should ignore ordering when comparing equality', () => {
            const backlogItemId = BacklogItemId.of('same-id');
            const item1 = new ScheduledBacklogItem(backlogItemId, 0);
            const item2 = new ScheduledBacklogItem(backlogItemId, 100);

            expect(item1.equals(item2)).toBe(true);
        });
    });

    describe('immutability', () => {
        it('should maintain immutable backlog item id', () => {
            const backlogItemId = BacklogItemId.unique();
            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 0);

            const retrievedId1 = scheduledItem.backlogItemId;
            const retrievedId2 = scheduledItem.backlogItemId;

            expect(retrievedId1).toBe(retrievedId2);
            expect(retrievedId1.id).toBe(backlogItemId.id);
        });

        it('should maintain immutable ordering', () => {
            const backlogItemId = BacklogItemId.unique();
            const scheduledItem = new ScheduledBacklogItem(backlogItemId, 7);

            const ordering1 = scheduledItem.ordering;
            const ordering2 = scheduledItem.ordering;

            expect(ordering1).toBe(ordering2);
            expect(ordering1).toBe(7);
        });
    });
});
