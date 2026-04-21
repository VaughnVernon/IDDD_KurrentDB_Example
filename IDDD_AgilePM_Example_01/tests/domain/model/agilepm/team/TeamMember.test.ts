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
import { TeamMember } from '../../../../../src/domain/model/agilepm/team/TeamMember';
import { MemberType } from '../../../../../src/domain/model/agilepm/team/MemberType';
import { ProductOwner } from '../../../../../src/domain/model/agilepm/team/ProductOwner';
import { TeamMemberId } from '../../../../../src/domain/model/agilepm/team/TeamMemberId';
import { ProductOwnerId } from '../../../../../src/domain/model/agilepm/team/ProductOwnerId';

describe('TeamMember', () => {
    describe('construction', () => {
        it('should create team member with valid data', () => {
            const teamMember = new TeamMember('tenant-1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(teamMember.tenantId).toBe('tenant-1');
            expect(teamMember.username).toBe('jdoe');
            expect(teamMember.firstName).toBe('John');
            expect(teamMember.lastName).toBe('Doe');
            expect(teamMember.emailAddress).toBe('john@example.com');
            expect(teamMember.memberType).toBe(MemberType.TeamMember);
            expect(teamMember.isEnabled).toBe(true);
        });

        it('should return correct fullName', () => {
            const teamMember = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(teamMember.fullName).toBe('John Doe');
        });
    });

    describe('memberType', () => {
        it('should be TeamMember', () => {
            const teamMember = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(teamMember.memberType).toBe(MemberType.TeamMember);
        });
    });

    describe('teamMemberId', () => {
        it('should return TeamMemberId with tenantId and username', () => {
            const teamMember = new TeamMember('tenant-1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const id = teamMember.teamMemberId();

            expect(id).toBeInstanceOf(TeamMemberId);
            expect(id.tenantId).toBe('tenant-1');
            expect(id.id).toBe('jdoe');
        });
    });

    describe('equality', () => {
        it('should be equal when tenantId and username match', () => {
            const m1 = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const m2 = new TeamMember('t1', 'jdoe', 'Jane', 'Smith', 'jane@example.com');

            expect(m1.equals(m2)).toBe(true);
        });

        it('should not be equal when usernames differ', () => {
            const m1 = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const m2 = new TeamMember('t1', 'jsmith', 'John', 'Doe', 'john@example.com');

            expect(m1.equals(m2)).toBe(false);
        });

        it('should be equal across member types when identity matches', () => {
            const teamMember = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const productOwner = new ProductOwner('t1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(teamMember.equals(productOwner)).toBe(true);
        });

        it('should return false for null', () => {
            const member = new TeamMember('t1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(member.equals(null as unknown as TeamMember)).toBe(false);
        });
    });
});

describe('ProductOwner', () => {
    describe('memberType', () => {
        it('should be ProductOwner', () => {
            const po = new ProductOwner('t1', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(po.memberType).toBe(MemberType.ProductOwner);
        });
    });

    describe('productOwnerId', () => {
        it('should return ProductOwnerId with tenantId and username', () => {
            const po = new ProductOwner('tenant-1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const id = po.productOwnerId();

            expect(id).toBeInstanceOf(ProductOwnerId);
            expect(id.tenantId).toBe('tenant-1');
            expect(id.id).toBe('jdoe');
        });
    });
});
