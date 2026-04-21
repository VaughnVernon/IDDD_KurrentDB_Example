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
import { BacklogItemStatus } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemStatus';

describe('BacklogItemStatus', () => {
    describe('enum values', () => {
        it('should have Planned status with correct value', () => {
            expect(BacklogItemStatus.Planned).toBe('PLANNED');
        });

        it('should have Scheduled status with correct value', () => {
            expect(BacklogItemStatus.Scheduled).toBe('SCHEDULED');
        });

        it('should have Committed status with correct value', () => {
            expect(BacklogItemStatus.Committed).toBe('COMMITTED');
        });

        it('should have Done status with correct value', () => {
            expect(BacklogItemStatus.Done).toBe('DONE');
        });

        it('should have Removed status with correct value', () => {
            expect(BacklogItemStatus.Removed).toBe('REMOVED');
        });

        it('should have exactly 5 status values', () => {
            const statusValues = Object.values(BacklogItemStatus).filter(
                value => typeof value === 'string'
            );
            expect(statusValues).toHaveLength(5);
        });
    });

    describe('isPlanned', () => {
        it('should return true for Planned status', () => {
            expect(BacklogItemStatus.isPlanned(BacklogItemStatus.Planned)).toBe(true);
        });

        it('should return false for Scheduled status', () => {
            expect(BacklogItemStatus.isPlanned(BacklogItemStatus.Scheduled)).toBe(false);
        });

        it('should return false for Committed status', () => {
            expect(BacklogItemStatus.isPlanned(BacklogItemStatus.Committed)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(BacklogItemStatus.isPlanned(BacklogItemStatus.Done)).toBe(false);
        });

        it('should return false for Removed status', () => {
            expect(BacklogItemStatus.isPlanned(BacklogItemStatus.Removed)).toBe(false);
        });
    });

    describe('isScheduled', () => {
        it('should return true for Scheduled status', () => {
            expect(BacklogItemStatus.isScheduled(BacklogItemStatus.Scheduled)).toBe(true);
        });

        it('should return false for Planned status', () => {
            expect(BacklogItemStatus.isScheduled(BacklogItemStatus.Planned)).toBe(false);
        });

        it('should return false for Committed status', () => {
            expect(BacklogItemStatus.isScheduled(BacklogItemStatus.Committed)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(BacklogItemStatus.isScheduled(BacklogItemStatus.Done)).toBe(false);
        });

        it('should return false for Removed status', () => {
            expect(BacklogItemStatus.isScheduled(BacklogItemStatus.Removed)).toBe(false);
        });
    });

    describe('isCommitted', () => {
        it('should return true for Committed status', () => {
            expect(BacklogItemStatus.isCommitted(BacklogItemStatus.Committed)).toBe(true);
        });

        it('should return false for Planned status', () => {
            expect(BacklogItemStatus.isCommitted(BacklogItemStatus.Planned)).toBe(false);
        });

        it('should return false for Scheduled status', () => {
            expect(BacklogItemStatus.isCommitted(BacklogItemStatus.Scheduled)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(BacklogItemStatus.isCommitted(BacklogItemStatus.Done)).toBe(false);
        });

        it('should return false for Removed status', () => {
            expect(BacklogItemStatus.isCommitted(BacklogItemStatus.Removed)).toBe(false);
        });
    });

    describe('isDone', () => {
        it('should return true for Done status', () => {
            expect(BacklogItemStatus.isDone(BacklogItemStatus.Done)).toBe(true);
        });

        it('should return false for Planned status', () => {
            expect(BacklogItemStatus.isDone(BacklogItemStatus.Planned)).toBe(false);
        });

        it('should return false for Scheduled status', () => {
            expect(BacklogItemStatus.isDone(BacklogItemStatus.Scheduled)).toBe(false);
        });

        it('should return false for Committed status', () => {
            expect(BacklogItemStatus.isDone(BacklogItemStatus.Committed)).toBe(false);
        });

        it('should return false for Removed status', () => {
            expect(BacklogItemStatus.isDone(BacklogItemStatus.Removed)).toBe(false);
        });
    });

    describe('isRemoved', () => {
        it('should return true for Removed status', () => {
            expect(BacklogItemStatus.isRemoved(BacklogItemStatus.Removed)).toBe(true);
        });

        it('should return false for Planned status', () => {
            expect(BacklogItemStatus.isRemoved(BacklogItemStatus.Planned)).toBe(false);
        });

        it('should return false for Scheduled status', () => {
            expect(BacklogItemStatus.isRemoved(BacklogItemStatus.Scheduled)).toBe(false);
        });

        it('should return false for Committed status', () => {
            expect(BacklogItemStatus.isRemoved(BacklogItemStatus.Committed)).toBe(false);
        });

        it('should return false for Done status', () => {
            expect(BacklogItemStatus.isRemoved(BacklogItemStatus.Done)).toBe(false);
        });
    });

    describe('ordinal', () => {
        it('should return 0 for Planned status', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Planned)).toBe(0);
        });

        it('should return 1 for Scheduled status', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Scheduled)).toBe(1);
        });

        it('should return 2 for Committed status', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Committed)).toBe(2);
        });

        it('should return 3 for Done status', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Done)).toBe(3);
        });

        it('should return -1 for Removed status', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Removed)).toBe(-1);
        });

        it('should order statuses correctly from low to high', () => {
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Planned))
                .toBeLessThan(BacklogItemStatus.ordinal(BacklogItemStatus.Scheduled));
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Scheduled))
                .toBeLessThan(BacklogItemStatus.ordinal(BacklogItemStatus.Committed));
            expect(BacklogItemStatus.ordinal(BacklogItemStatus.Committed))
                .toBeLessThan(BacklogItemStatus.ordinal(BacklogItemStatus.Done));
        });
    });

    describe('regress', () => {
        it('should return Planned for Planned status', () => {
            expect(BacklogItemStatus.regress(BacklogItemStatus.Planned)).toBe(BacklogItemStatus.Planned);
        });

        it('should return Planned for Scheduled status', () => {
            expect(BacklogItemStatus.regress(BacklogItemStatus.Scheduled)).toBe(BacklogItemStatus.Planned);
        });

        it('should return Scheduled for Committed status', () => {
            expect(BacklogItemStatus.regress(BacklogItemStatus.Committed)).toBe(BacklogItemStatus.Scheduled);
        });

        it('should return Committed for Done status', () => {
            expect(BacklogItemStatus.regress(BacklogItemStatus.Done)).toBe(BacklogItemStatus.Committed);
        });

        it('should return Planned for Removed status', () => {
            expect(BacklogItemStatus.regress(BacklogItemStatus.Removed)).toBe(BacklogItemStatus.Planned);
        });
    });
});
