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
import { BusinessPriorityRatings } from '../../../../../src/domain/model/agilepm/backlogitem/BusinessPriorityRatings';
import { BusinessPriorityTotals } from '../../../../../src/domain/model/agilepm/backlogitem/BusinessPriorityTotals';
import { BusinessPriority } from '../../../../../src/domain/model/agilepm/backlogitem/BusinessPriority';
import { BusinessPriorityCalculator } from '../../../../../src/domain/model/agilepm/backlogitem/BusinessPriorityCalculator';
import { EstimationLogEntry } from '../../../../../src/domain/model/agilepm/backlogitem/EstimationLogEntry';
import { TaskId } from '../../../../../src/domain/model/agilepm/backlogitem/TaskId';

describe('BusinessPriorityRatings', () => {
    describe('creation', () => {
        it('should create ratings with valid values (1-9)', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);

            expect(ratings.benefit).toBe(5);
            expect(ratings.penalty).toBe(3);
            expect(ratings.cost).toBe(2);
            expect(ratings.risk).toBe(1);
        });

        it('should allow boundary value 1', () => {
            const ratings = BusinessPriorityRatings.with(1, 1, 1, 1);

            expect(ratings.benefit).toBe(1);
            expect(ratings.penalty).toBe(1);
            expect(ratings.cost).toBe(1);
            expect(ratings.risk).toBe(1);
        });

        it('should allow boundary value 9', () => {
            const ratings = BusinessPriorityRatings.with(9, 9, 9, 9);

            expect(ratings.benefit).toBe(9);
            expect(ratings.penalty).toBe(9);
            expect(ratings.cost).toBe(9);
            expect(ratings.risk).toBe(9);
        });

        it('should throw error for benefit below 1', () => {
            expect(() => BusinessPriorityRatings.with(0, 1, 1, 1))
                .toThrow('Relative benefit must be between 1 and 9.');
        });

        it('should throw error for benefit above 9', () => {
            expect(() => BusinessPriorityRatings.with(10, 1, 1, 1))
                .toThrow('Relative benefit must be between 1 and 9.');
        });

        it('should throw error for penalty below 1', () => {
            expect(() => BusinessPriorityRatings.with(1, 0, 1, 1))
                .toThrow('Relative penalty must be between 1 and 9.');
        });

        it('should throw error for penalty above 9', () => {
            expect(() => BusinessPriorityRatings.with(1, 10, 1, 1))
                .toThrow('Relative penalty must be between 1 and 9.');
        });

        it('should throw error for cost below 1', () => {
            expect(() => BusinessPriorityRatings.with(1, 1, 0, 1))
                .toThrow('Relative cost must be between 1 and 9.');
        });

        it('should throw error for cost above 9', () => {
            expect(() => BusinessPriorityRatings.with(1, 1, 10, 1))
                .toThrow('Relative cost must be between 1 and 9.');
        });

        it('should throw error for risk below 1', () => {
            expect(() => BusinessPriorityRatings.with(1, 1, 1, 0))
                .toThrow('Relative risk must be between 1 and 9.');
        });

        it('should throw error for risk above 9', () => {
            expect(() => BusinessPriorityRatings.with(1, 1, 1, 10))
                .toThrow('Relative risk must be between 1 and 9.');
        });
    });

    describe('copy', () => {
        it('should create copy with same values', () => {
            const original = BusinessPriorityRatings.with(5, 3, 2, 1);
            const copy = BusinessPriorityRatings.copy(original);

            expect(copy.equals(original)).toBe(true);
        });
    });

    describe('withAdjusted methods', () => {
        it('should create new ratings with adjusted benefit', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);
            const adjusted = ratings.withAdjustedBenefit(8);

            expect(adjusted.benefit).toBe(8);
            expect(adjusted.penalty).toBe(3);
            expect(adjusted.cost).toBe(2);
            expect(adjusted.risk).toBe(1);
        });

        it('should create new ratings with adjusted penalty', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);
            const adjusted = ratings.withAdjustedPenalty(7);

            expect(adjusted.benefit).toBe(5);
            expect(adjusted.penalty).toBe(7);
            expect(adjusted.cost).toBe(2);
            expect(adjusted.risk).toBe(1);
        });

        it('should create new ratings with adjusted cost', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);
            const adjusted = ratings.withAdjustedCost(6);

            expect(adjusted.benefit).toBe(5);
            expect(adjusted.penalty).toBe(3);
            expect(adjusted.cost).toBe(6);
            expect(adjusted.risk).toBe(1);
        });

        it('should create new ratings with adjusted risk', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);
            const adjusted = ratings.withAdjustedRisk(4);

            expect(adjusted.benefit).toBe(5);
            expect(adjusted.penalty).toBe(3);
            expect(adjusted.cost).toBe(2);
            expect(adjusted.risk).toBe(4);
        });

        it('should not modify original ratings', () => {
            const ratings = BusinessPriorityRatings.with(5, 3, 2, 1);
            ratings.withAdjustedBenefit(8);

            expect(ratings.benefit).toBe(5);
        });
    });

    describe('equality', () => {
        it('should be equal when all values match', () => {
            const r1 = BusinessPriorityRatings.with(5, 3, 2, 1);
            const r2 = BusinessPriorityRatings.with(5, 3, 2, 1);

            expect(r1.equals(r2)).toBe(true);
        });

        it('should not be equal when values differ', () => {
            const r1 = BusinessPriorityRatings.with(5, 3, 2, 1);
            const r2 = BusinessPriorityRatings.with(5, 3, 2, 2);

            expect(r1.equals(r2)).toBe(false);
        });

        it('should return false for null', () => {
            const r = BusinessPriorityRatings.with(5, 3, 2, 1);

            expect(r.equals(null as unknown as BusinessPriorityRatings)).toBe(false);
        });
    });
});

describe('BusinessPriorityTotals', () => {
    describe('creation', () => {
        it('should create totals with values', () => {
            const totals = BusinessPriorityTotals.of(10, 8, 6, 4);

            expect(totals.totalBenefit).toBe(10);
            expect(totals.totalPenalty).toBe(8);
            expect(totals.totalCost).toBe(6);
            expect(totals.totalRisk).toBe(4);
        });

        it('should create zero totals', () => {
            const totals = BusinessPriorityTotals.zero();

            expect(totals.totalBenefit).toBe(0);
            expect(totals.totalPenalty).toBe(0);
            expect(totals.totalCost).toBe(0);
            expect(totals.totalRisk).toBe(0);
        });
    });

    describe('calculated properties', () => {
        it('should calculate total value', () => {
            const totals = BusinessPriorityTotals.of(10, 8, 6, 4);

            expect(totals.totalValue).toBe(18); // 10 + 8
        });

        it('should calculate total effort', () => {
            const totals = BusinessPriorityTotals.of(10, 8, 6, 4);

            expect(totals.totalEffort).toBe(10); // 6 + 4
        });
    });

    describe('equality', () => {
        it('should be equal when all values match', () => {
            const t1 = BusinessPriorityTotals.of(10, 8, 6, 4);
            const t2 = BusinessPriorityTotals.of(10, 8, 6, 4);

            expect(t1.equals(t2)).toBe(true);
        });
    });
});

describe('BusinessPriority', () => {
    describe('creation', () => {
        it('should create with ratings', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);

            expect(priority.ratings.benefit).toBe(5);
            expect(priority.ratings.penalty).toBe(3);
            expect(priority.ratings.cost).toBe(2);
            expect(priority.ratings.risk).toBe(1);
        });
    });

    describe('totalValue', () => {
        it('should return benefit + penalty', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);

            expect(priority.totalValue()).toBe(8); // 5 + 3
        });
    });

    describe('percentage calculations', () => {
        it('should calculate cost percentage', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);
            const totals = BusinessPriorityTotals.of(10, 6, 8, 4);

            // 100 * 2 / 8 = 25
            expect(priority.costPercentage(totals)).toBe(25);
        });

        it('should calculate risk percentage', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);
            const totals = BusinessPriorityTotals.of(10, 6, 8, 4);

            // 100 * 1 / 4 = 25
            expect(priority.riskPercentage(totals)).toBe(25);
        });

        it('should calculate value percentage', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);
            const totals = BusinessPriorityTotals.of(10, 6, 8, 4);

            // 100 * (5 + 3) / (10 + 6) = 100 * 8 / 16 = 50
            expect(priority.valuePercentage(totals)).toBe(50);
        });
    });

    describe('priority', () => {
        it('should calculate priority as valuePercentage / (costPercentage + riskPercentage)', () => {
            const priority = BusinessPriority.of(5, 3, 2, 1);
            const totals = BusinessPriorityTotals.of(10, 6, 8, 4);

            // value% = 50, cost% = 25, risk% = 25
            // priority = 50 / (25 + 25) = 1.0
            expect(priority.priority(totals)).toBe(1.0);
        });

        it('should give higher priority to high value / low cost items', () => {
            const highValue = BusinessPriority.of(9, 8, 1, 1);
            const lowValue = BusinessPriority.of(1, 1, 9, 8);
            const totals = BusinessPriorityTotals.of(10, 9, 10, 9);

            expect(highValue.priority(totals)).toBeGreaterThan(lowValue.priority(totals));
        });
    });

    describe('equality', () => {
        it('should be equal when ratings match', () => {
            const p1 = BusinessPriority.of(5, 3, 2, 1);
            const p2 = BusinessPriority.of(5, 3, 2, 1);

            expect(p1.equals(p2)).toBe(true);
        });

        it('should not be equal when ratings differ', () => {
            const p1 = BusinessPriority.of(5, 3, 2, 1);
            const p2 = BusinessPriority.of(5, 3, 2, 2);

            expect(p1.equals(p2)).toBe(false);
        });

        it('should return false for null', () => {
            const p = BusinessPriority.of(5, 3, 2, 1);

            expect(p.equals(null as unknown as BusinessPriority)).toBe(false);
        });
    });
});

describe('BusinessPriorityCalculator', () => {
    describe('calculateTotals', () => {
        it('should sum all ratings', () => {
            const ratings = [
                BusinessPriorityRatings.with(5, 3, 2, 1),
                BusinessPriorityRatings.with(3, 2, 4, 2),
                BusinessPriorityRatings.with(2, 1, 3, 1)
            ];

            const totals = BusinessPriorityCalculator.calculateTotals(ratings);

            expect(totals.totalBenefit).toBe(10); // 5 + 3 + 2
            expect(totals.totalPenalty).toBe(6);  // 3 + 2 + 1
            expect(totals.totalCost).toBe(9);     // 2 + 4 + 3
            expect(totals.totalRisk).toBe(4);     // 1 + 2 + 1
        });
    });

    describe('calculateAll', () => {
        it('should create priorities for all items', () => {
            const ratings = [
                BusinessPriorityRatings.with(5, 3, 2, 1),
                BusinessPriorityRatings.with(3, 2, 4, 2),
                BusinessPriorityRatings.with(2, 1, 3, 1)
            ];

            const priorities = BusinessPriorityCalculator.calculateAll(ratings);

            expect(priorities).toHaveLength(3);
            expect(priorities[0].ratings.equals(ratings[0])).toBe(true);
            expect(priorities[1].ratings.equals(ratings[1])).toBe(true);
            expect(priorities[2].ratings.equals(ratings[2])).toBe(true);
        });
    });

    describe('sortByPriority', () => {
        it('should sort by priority value descending', () => {
            const ratings = [
                BusinessPriorityRatings.with(2, 1, 3, 1), // Low priority (low value, high cost)
                BusinessPriorityRatings.with(5, 3, 1, 1), // High priority (high value, low cost)
                BusinessPriorityRatings.with(3, 2, 2, 1)  // Medium priority
            ];

            const priorities = BusinessPriorityCalculator.calculateAll(ratings);
            const totals = BusinessPriorityCalculator.calculateTotals(ratings);
            const sortedIndices = BusinessPriorityCalculator.sortByPriority(priorities, totals);

            // Index 1 should be first (highest priority)
            expect(sortedIndices[0]).toBe(1);
            // Index 0 should be last (lowest priority)
            expect(sortedIndices[2]).toBe(0);
        });
    });
});

describe('EstimationLogEntry', () => {
    describe('creation', () => {
        it('should create entry with taskId, date, and hoursRemaining', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const entry = new EstimationLogEntry(taskId, date, 8);

            expect(entry.taskId).toBe(taskId);
            expect(entry.date).toEqual(date);
            expect(entry.hoursRemaining).toBe(8);
        });
    });

    describe('currentLogDate', () => {
        it('should return today with time zeroed out', () => {
            const logDate = EstimationLogEntry.currentLogDate();
            const now = new Date();

            expect(logDate.getFullYear()).toBe(now.getFullYear());
            expect(logDate.getMonth()).toBe(now.getMonth());
            expect(logDate.getDate()).toBe(now.getDate());
            expect(logDate.getHours()).toBe(0);
            expect(logDate.getMinutes()).toBe(0);
            expect(logDate.getSeconds()).toBe(0);
            expect(logDate.getMilliseconds()).toBe(0);
        });
    });

    describe('isMatching', () => {
        it('should match when dates are equal', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const entry = new EstimationLogEntry(taskId, date, 8);

            expect(entry.isMatching(new Date('2024-01-15'))).toBe(true);
        });

        it('should not match when dates differ', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const entry = new EstimationLogEntry(taskId, date, 8);

            expect(entry.isMatching(new Date('2024-01-16'))).toBe(false);
        });
    });

    describe('updateHoursRemainingWhenDateMatches', () => {
        it('should update hours and return true when date matches', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const entry = new EstimationLogEntry(taskId, date, 8);

            const updated = entry.updateHoursRemainingWhenDateMatches(4, new Date('2024-01-15'));

            expect(updated).toBe(true);
            expect(entry.hoursRemaining).toBe(4);
        });

        it('should not update and return false when date does not match', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const entry = new EstimationLogEntry(taskId, date, 8);

            const updated = entry.updateHoursRemainingWhenDateMatches(4, new Date('2024-01-16'));

            expect(updated).toBe(false);
            expect(entry.hoursRemaining).toBe(8);
        });
    });

    describe('equality', () => {
        it('should be equal when all values match', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const e1 = new EstimationLogEntry(taskId, date, 8);
            const e2 = new EstimationLogEntry(taskId, new Date('2024-01-15'), 8);

            expect(e1.equals(e2)).toBe(true);
        });

        it('should not be equal when hoursRemaining differ', () => {
            const taskId = TaskId.generate();
            const date = new Date('2024-01-15');
            const e1 = new EstimationLogEntry(taskId, date, 8);
            const e2 = new EstimationLogEntry(taskId, date, 4);

            expect(e1.equals(e2)).toBe(false);
        });

        it('should not be equal when dates differ', () => {
            const taskId = TaskId.generate();
            const e1 = new EstimationLogEntry(taskId, new Date('2024-01-15'), 8);
            const e2 = new EstimationLogEntry(taskId, new Date('2024-01-16'), 8);

            expect(e1.equals(e2)).toBe(false);
        });

        it('should return false for null', () => {
            const taskId = TaskId.generate();
            const entry = new EstimationLogEntry(taskId, new Date(), 8);

            expect(entry.equals(null as unknown as EstimationLogEntry)).toBe(false);
        });
    });
});
