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
import { TeamMemberId } from '../../../../../src/domain/model/agilepm/team/TeamMemberId';

describe('TeamMemberId', () => {
    describe('of', () => {
        it('should create an ID from tenantId and id', () => {
            const id = TeamMemberId.of('tenant-1', 'member-123');

            expect(id.tenantId).toBe('tenant-1');
            expect(id.id).toBe('member-123');
        });

        it('should throw error for empty id', () => {
            expect(() => TeamMemberId.of('tenant-1', '')).toThrow('TeamMemberId cannot be empty');
        });

        it('should throw error for whitespace-only id', () => {
            expect(() => TeamMemberId.of('tenant-1', '   ')).toThrow('TeamMemberId cannot be empty');
        });

        it('should throw error for empty tenantId', () => {
            expect(() => TeamMemberId.of('', 'member-123')).toThrow('Tenant ID cannot be empty');
        });

        it('should throw error for null id', () => {
            expect(() => TeamMemberId.of('tenant-1', null as unknown as string)).toThrow('TeamMemberId cannot be empty');
        });

        it('should throw error for undefined id', () => {
            expect(() => TeamMemberId.of('tenant-1', undefined as unknown as string)).toThrow('TeamMemberId cannot be empty');
        });
    });

    describe('equals', () => {
        it('should return true when both tenantId and id match', () => {
            const id1 = TeamMemberId.of('t1', 'member-123');
            const id2 = TeamMemberId.of('t1', 'member-123');

            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false when ids differ', () => {
            const id1 = TeamMemberId.of('t1', 'member-123');
            const id2 = TeamMemberId.of('t1', 'member-456');

            expect(id1.equals(id2)).toBe(false);
        });

        it('should return false when tenantIds differ', () => {
            const id1 = TeamMemberId.of('t1', 'member-123');
            const id2 = TeamMemberId.of('t2', 'member-123');

            expect(id1.equals(id2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const id = TeamMemberId.of('t1', 'member-123');

            expect(id.equals(null as unknown as TeamMemberId)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const id = TeamMemberId.of('t1', 'member-123');

            expect(id.equals(undefined as unknown as TeamMemberId)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return tenantId:id', () => {
            const id = TeamMemberId.of('tenant-1', 'member-123');

            expect(id.toString()).toBe('tenant-1:member-123');
        });
    });
});
