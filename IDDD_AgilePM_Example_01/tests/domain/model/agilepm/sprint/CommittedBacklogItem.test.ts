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
import { CommittedBacklogItem } from '../../../../../src/domain/model/agilepm/sprint/CommittedBacklogItem';
import { BacklogItemId } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemId';

describe('CommittedBacklogItem', () => {
    describe('constructor', () => {
        it('should create a committed backlog item with valid data', () => {
            const backlogItemId = BacklogItemId.generate();
            const ordering = 0;

            const committedItem = new CommittedBacklogItem(backlogItemId, ordering);

            expect(committedItem.backlogItemId).toBe(backlogItemId);
            expect(committedItem.ordering).toBe(ordering);
        });

        it('should create a committed backlog item with ordering of zero', () => {
            const backlogItemId = BacklogItemId.generate();

            const committedItem = new CommittedBacklogItem(backlogItemId, 0);

            expect(committedItem.ordering).toBe(0);
        });

        it('should create a committed backlog item with positive ordering', () => {
            const backlogItemId = BacklogItemId.generate();

            const committedItem = new CommittedBacklogItem(backlogItemId, 10);

            expect(committedItem.ordering).toBe(10);
        });

        it('should create a committed backlog item with large ordering value', () => {
            const backlogItemId = BacklogItemId.generate();
            const largeOrdering = 999999;

            const committedItem = new CommittedBacklogItem(backlogItemId, largeOrdering);

            expect(committedItem.ordering).toBe(largeOrdering);
        });

        it('should throw error when ordering is negative', () => {
            const backlogItemId = BacklogItemId.generate();

            expect(() => new CommittedBacklogItem(backlogItemId, -1))
                .toThrow('Ordering must be non-negative');
        });

        it('should throw error when ordering is large negative value', () => {
            const backlogItemId = BacklogItemId.generate();

            expect(() => new CommittedBacklogItem(backlogItemId, -100))
                .toThrow('Ordering must be non-negative');
        });
    });

    describe('backlogItemId getter', () => {
        it('should return the backlog item id', () => {
            const backlogItemId = BacklogItemId.generate();
            const committedItem = new CommittedBacklogItem(backlogItemId, 5);

            expect(committedItem.backlogItemId).toBe(backlogItemId);
            expect(committedItem.backlogItemId.id).toBe(backlogItemId.id);
        });
    });

    describe('ordering getter', () => {
        it('should return the ordering value', () => {
            const backlogItemId = BacklogItemId.generate();
            const committedItem = new CommittedBacklogItem(backlogItemId, 42);

            expect(committedItem.ordering).toBe(42);
        });
    });

    describe('equals', () => {
        it('should return true when backlog item ids are equal', () => {
            const backlogItemId = BacklogItemId.of('same-id');
            const item1 = new CommittedBacklogItem(backlogItemId, 0);
            const item2 = new CommittedBacklogItem(backlogItemId, 5);

            expect(item1.equals(item2)).toBe(true);
        });

        it('should return true when comparing items with same backlog item id but different instances', () => {
            const id = 'shared-id';
            const backlogItemId1 = BacklogItemId.of(id);
            const backlogItemId2 = BacklogItemId.of(id);
            const item1 = new CommittedBacklogItem(backlogItemId1, 0);
            const item2 = new CommittedBacklogItem(backlogItemId2, 10);

            expect(item1.equals(item2)).toBe(true);
        });

        it('should return false when backlog item ids are different', () => {
            const backlogItemId1 = BacklogItemId.generate();
            const backlogItemId2 = BacklogItemId.generate();
            const item1 = new CommittedBacklogItem(backlogItemId1, 0);
            const item2 = new CommittedBacklogItem(backlogItemId2, 0);

            expect(item1.equals(item2)).toBe(false);
        });

        it('should return false when other is null', () => {
            const backlogItemId = BacklogItemId.generate();
            const item = new CommittedBacklogItem(backlogItemId, 0);

            expect(item.equals(null as unknown as CommittedBacklogItem)).toBe(false);
        });

        it('should return false when other is undefined', () => {
            const backlogItemId = BacklogItemId.generate();
            const item = new CommittedBacklogItem(backlogItemId, 0);

            expect(item.equals(undefined as unknown as CommittedBacklogItem)).toBe(false);
        });

        it('should be reflexive - item equals itself', () => {
            const backlogItemId = BacklogItemId.generate();
            const item = new CommittedBacklogItem(backlogItemId, 5);

            expect(item.equals(item)).toBe(true);
        });

        it('should be symmetric - if a equals b then b equals a', () => {
            const backlogItemId = BacklogItemId.of('test-id');
            const item1 = new CommittedBacklogItem(backlogItemId, 1);
            const item2 = new CommittedBacklogItem(backlogItemId, 2);

            expect(item1.equals(item2)).toBe(true);
            expect(item2.equals(item1)).toBe(true);
        });

        it('should be transitive - if a equals b and b equals c then a equals c', () => {
            const backlogItemId = BacklogItemId.of('transitive-id');
            const item1 = new CommittedBacklogItem(backlogItemId, 1);
            const item2 = new CommittedBacklogItem(backlogItemId, 2);
            const item3 = new CommittedBacklogItem(backlogItemId, 3);

            expect(item1.equals(item2)).toBe(true);
            expect(item2.equals(item3)).toBe(true);
            expect(item1.equals(item3)).toBe(true);
        });

        it('should ignore ordering when comparing equality', () => {
            const backlogItemId = BacklogItemId.of('same-id');
            const item1 = new CommittedBacklogItem(backlogItemId, 0);
            const item2 = new CommittedBacklogItem(backlogItemId, 100);

            expect(item1.equals(item2)).toBe(true);
        });
    });

    describe('immutability', () => {
        it('should maintain immutable backlog item id', () => {
            const backlogItemId = BacklogItemId.generate();
            const committedItem = new CommittedBacklogItem(backlogItemId, 0);

            const retrievedId1 = committedItem.backlogItemId;
            const retrievedId2 = committedItem.backlogItemId;

            expect(retrievedId1).toBe(retrievedId2);
            expect(retrievedId1.id).toBe(backlogItemId.id);
        });

        it('should maintain immutable ordering', () => {
            const backlogItemId = BacklogItemId.generate();
            const committedItem = new CommittedBacklogItem(backlogItemId, 7);

            const ordering1 = committedItem.ordering;
            const ordering2 = committedItem.ordering;

            expect(ordering1).toBe(ordering2);
            expect(ordering1).toBe(7);
        });
    });
});
