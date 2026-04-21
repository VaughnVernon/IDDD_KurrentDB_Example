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
import { TaskStatus } from '../../../../../src/domain/model/agilepm/backlogitem/TaskStatus';

describe('TaskStatus', () => {
    describe('enum values', () => {
        it('should have NotStarted status with correct value', () => {
            expect(TaskStatus.NotStarted).toBe('NOT_STARTED');
        });

        it('should have InProgress status with correct value', () => {
            expect(TaskStatus.InProgress).toBe('IN_PROGRESS');
        });

        it('should have Impediment status with correct value', () => {
            expect(TaskStatus.Impediment).toBe('IMPEDIMENT');
        });

        it('should have Done status with correct value', () => {
            expect(TaskStatus.Done).toBe('DONE');
        });

        it('should have exactly 4 status values', () => {
            const statusValues = Object.values(TaskStatus).filter(
                value => typeof value === 'string'
            );
            expect(statusValues).toHaveLength(4);
        });
    });

    describe('isNotStarted', () => {
        it('should return true for NotStarted status', () => {
            expect(TaskStatus.isNotStarted(TaskStatus.NotStarted)).toBe(true);
        });

        it('should return false for InProgress status', () => {
            expect(TaskStatus.isNotStarted(TaskStatus.InProgress)).toBe(false);
        });

        it('should return false for Impediment status', () => {
            expect(TaskStatus.isNotStarted(TaskStatus.Impediment)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(TaskStatus.isNotStarted(TaskStatus.Done)).toBe(false);
        });
    });

    describe('isInProgress', () => {
        it('should return true for InProgress status', () => {
            expect(TaskStatus.isInProgress(TaskStatus.InProgress)).toBe(true);
        });

        it('should return false for NotStarted status', () => {
            expect(TaskStatus.isInProgress(TaskStatus.NotStarted)).toBe(false);
        });

        it('should return false for Impediment status', () => {
            expect(TaskStatus.isInProgress(TaskStatus.Impediment)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(TaskStatus.isInProgress(TaskStatus.Done)).toBe(false);
        });
    });

    describe('hasImpediment', () => {
        it('should return true for Impediment status', () => {
            expect(TaskStatus.hasImpediment(TaskStatus.Impediment)).toBe(true);
        });

        it('should return false for NotStarted status', () => {
            expect(TaskStatus.hasImpediment(TaskStatus.NotStarted)).toBe(false);
        });

        it('should return false for InProgress status', () => {
            expect(TaskStatus.hasImpediment(TaskStatus.InProgress)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(TaskStatus.hasImpediment(TaskStatus.Done)).toBe(false);
        });
    });

    describe('isDone', () => {
        it('should return true for Done status', () => {
            expect(TaskStatus.isDone(TaskStatus.Done)).toBe(true);
        });

        it('should return false for NotStarted status', () => {
            expect(TaskStatus.isDone(TaskStatus.NotStarted)).toBe(false);
        });

        it('should return false for InProgress status', () => {
            expect(TaskStatus.isDone(TaskStatus.InProgress)).toBe(false);
        });

        it('should return false for Impediment status', () => {
            expect(TaskStatus.isDone(TaskStatus.Impediment)).toBe(false);
        });
    });
});
