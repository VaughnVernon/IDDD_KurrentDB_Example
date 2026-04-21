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
import { StoryPoints } from '../../../../../src/domain/model/agilepm/backlogitem/StoryPoints';

describe('StoryPoints', () => {
    describe('creation with of()', () => {
        it('should create story points with valid value 1', () => {
            const storyPoints = StoryPoints.of(1);

            expect(storyPoints.points).toBe(1);
        });

        it('should create story points with valid value 2', () => {
            const storyPoints = StoryPoints.of(2);

            expect(storyPoints.points).toBe(2);
        });

        it('should create story points with valid value 3', () => {
            const storyPoints = StoryPoints.of(3);

            expect(storyPoints.points).toBe(3);
        });

        it('should create story points with valid value 5', () => {
            const storyPoints = StoryPoints.of(5);

            expect(storyPoints.points).toBe(5);
        });

        it('should create story points with valid value 8', () => {
            const storyPoints = StoryPoints.of(8);

            expect(storyPoints.points).toBe(8);
        });

        it('should create story points with valid value 13', () => {
            const storyPoints = StoryPoints.of(13);

            expect(storyPoints.points).toBe(13);
        });

        it('should create story points with valid value 21', () => {
            const storyPoints = StoryPoints.of(21);

            expect(storyPoints.points).toBe(21);
        });

        it('should throw error for invalid value 0', () => {
            expect(() => StoryPoints.of(0)).toThrow(
                'Invalid story points: 0. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for invalid value 4', () => {
            expect(() => StoryPoints.of(4)).toThrow(
                'Invalid story points: 4. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for invalid value 6', () => {
            expect(() => StoryPoints.of(6)).toThrow(
                'Invalid story points: 6. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for invalid value 7', () => {
            expect(() => StoryPoints.of(7)).toThrow(
                'Invalid story points: 7. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for invalid value 10', () => {
            expect(() => StoryPoints.of(10)).toThrow(
                'Invalid story points: 10. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for negative value', () => {
            expect(() => StoryPoints.of(-1)).toThrow(
                'Invalid story points: -1. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });

        it('should throw error for value larger than 21', () => {
            expect(() => StoryPoints.of(34)).toThrow(
                'Invalid story points: 34. Must be one of 1, 2, 3, 5, 8, 13, 21'
            );
        });
    });

    describe('factory methods', () => {
        it('should create story points of 1 using one()', () => {
            const storyPoints = StoryPoints.one();

            expect(storyPoints.points).toBe(1);
        });

        it('should create story points of 2 using two()', () => {
            const storyPoints = StoryPoints.two();

            expect(storyPoints.points).toBe(2);
        });

        it('should create story points of 3 using three()', () => {
            const storyPoints = StoryPoints.three();

            expect(storyPoints.points).toBe(3);
        });

        it('should create story points of 5 using five()', () => {
            const storyPoints = StoryPoints.five();

            expect(storyPoints.points).toBe(5);
        });

        it('should create story points of 8 using eight()', () => {
            const storyPoints = StoryPoints.eight();

            expect(storyPoints.points).toBe(8);
        });

        it('should create story points of 13 using thirteen()', () => {
            const storyPoints = StoryPoints.thirteen();

            expect(storyPoints.points).toBe(13);
        });

        it('should create story points of 21 using twentyOne()', () => {
            const storyPoints = StoryPoints.twentyOne();

            expect(storyPoints.points).toBe(21);
        });
    });

    describe('equality', () => {
        it('should be equal when points match', () => {
            const sp1 = StoryPoints.of(5);
            const sp2 = StoryPoints.of(5);

            expect(sp1.equals(sp2)).toBe(true);
        });

        it('should be equal when created with factory methods and of()', () => {
            const sp1 = StoryPoints.five();
            const sp2 = StoryPoints.of(5);

            expect(sp1.equals(sp2)).toBe(true);
        });

        it('should not be equal when points differ', () => {
            const sp1 = StoryPoints.of(5);
            const sp2 = StoryPoints.of(8);

            expect(sp1.equals(sp2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const sp1 = StoryPoints.of(5);

            expect(sp1.equals(null as unknown as StoryPoints)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const sp1 = StoryPoints.of(5);

            expect(sp1.equals(undefined as unknown as StoryPoints)).toBe(false);
        });

        it('should be equal for all factory method pairs', () => {
            expect(StoryPoints.one().equals(StoryPoints.one())).toBe(true);
            expect(StoryPoints.two().equals(StoryPoints.two())).toBe(true);
            expect(StoryPoints.three().equals(StoryPoints.three())).toBe(true);
            expect(StoryPoints.five().equals(StoryPoints.five())).toBe(true);
            expect(StoryPoints.eight().equals(StoryPoints.eight())).toBe(true);
            expect(StoryPoints.thirteen().equals(StoryPoints.thirteen())).toBe(true);
            expect(StoryPoints.twentyOne().equals(StoryPoints.twentyOne())).toBe(true);
        });
    });

    describe('toString', () => {
        it('should return formatted string for 1 point', () => {
            const storyPoints = StoryPoints.one();

            expect(storyPoints.toString()).toBe('1 points');
        });

        it('should return formatted string for 2 points', () => {
            const storyPoints = StoryPoints.two();

            expect(storyPoints.toString()).toBe('2 points');
        });

        it('should return formatted string for 3 points', () => {
            const storyPoints = StoryPoints.three();

            expect(storyPoints.toString()).toBe('3 points');
        });

        it('should return formatted string for 5 points', () => {
            const storyPoints = StoryPoints.five();

            expect(storyPoints.toString()).toBe('5 points');
        });

        it('should return formatted string for 8 points', () => {
            const storyPoints = StoryPoints.eight();

            expect(storyPoints.toString()).toBe('8 points');
        });

        it('should return formatted string for 13 points', () => {
            const storyPoints = StoryPoints.thirteen();

            expect(storyPoints.toString()).toBe('13 points');
        });

        it('should return formatted string for 21 points', () => {
            const storyPoints = StoryPoints.twentyOne();

            expect(storyPoints.toString()).toBe('21 points');
        });
    });

    describe('immutability', () => {
        it('should return the same value on multiple points access', () => {
            const storyPoints = StoryPoints.of(8);

            expect(storyPoints.points).toBe(8);
            expect(storyPoints.points).toBe(8);
            expect(storyPoints.points).toBe(8);
        });
    });

    describe('value object semantics', () => {
        it('should create independent instances', () => {
            const sp1 = StoryPoints.of(5);
            const sp2 = StoryPoints.of(5);

            // They are equal in value
            expect(sp1.equals(sp2)).toBe(true);
            // But different object references
            expect(sp1).not.toBe(sp2);
        });
    });
});
