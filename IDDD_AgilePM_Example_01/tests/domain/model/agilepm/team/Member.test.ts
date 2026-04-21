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
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { TeamId } from '../../../../../src/domain/model/agilepm/team/TeamId';
import { MemberChangeTracker } from '../../../../../src/domain/model/agilepm/team/MemberChangeTracker';
import { MemberType } from '../../../../../src/domain/model/agilepm/team/MemberType';
import { ProductOwner } from '../../../../../src/domain/model/agilepm/team/ProductOwner';
import { TeamMember } from '../../../../../src/domain/model/agilepm/team/TeamMember';
import { TeamMemberEmailAddressChanged } from '../../../../../src/domain/model/agilepm/team/events/TeamMemberEmailAddressChanged';
import { TeamMemberNameChanged } from '../../../../../src/domain/model/agilepm/team/events/TeamMemberNameChanged';
import { TeamMemberEnabled } from '../../../../../src/domain/model/agilepm/team/events/TeamMemberEnabled';
import { TeamMemberDisabled } from '../../../../../src/domain/model/agilepm/team/events/TeamMemberDisabled';

describe('MemberChangeTracker', () => {
    describe('creation', () => {
        it('should create with no changes', () => {
            const tracker = MemberChangeTracker.create();

            expect(tracker.emailAddressChangedOn).toBeUndefined();
            expect(tracker.nameChangedOn).toBeUndefined();
            expect(tracker.enabledOn).toBeUndefined();
            expect(tracker.disabledOn).toBeUndefined();
            expect(tracker.isEnabled).toBe(true); // Default enabled
        });
    });

    describe('email address change tracking', () => {
        it('should record email address change', () => {
            const tracker = MemberChangeTracker.create();
            const changed = tracker.emailAddressChanged();

            expect(changed.emailAddressChangedOn).toBeDefined();
        });

        it('should detect email change since date', () => {
            const pastDate = new Date('2024-01-01');
            const tracker = MemberChangeTracker.create().emailAddressChanged();

            expect(tracker.hasEmailAddressChangedSince(pastDate)).toBe(true);
        });

        it('should not detect email change before date', () => {
            const futureDate = new Date('2099-01-01');
            const tracker = MemberChangeTracker.create().emailAddressChanged();

            expect(tracker.hasEmailAddressChangedSince(futureDate)).toBe(false);
        });
    });

    describe('name change tracking', () => {
        it('should record name change', () => {
            const tracker = MemberChangeTracker.create();
            const changed = tracker.nameChanged();

            expect(changed.nameChangedOn).toBeDefined();
        });

        it('should detect name change since date', () => {
            const pastDate = new Date('2024-01-01');
            const tracker = MemberChangeTracker.create().nameChanged();

            expect(tracker.hasNameChangedSince(pastDate)).toBe(true);
        });
    });

    describe('enablement tracking', () => {
        it('should record enablement', () => {
            const tracker = MemberChangeTracker.create().disabled().enabled();

            expect(tracker.enabledOn).toBeDefined();
            expect(tracker.isEnabled).toBe(true);
        });

        it('should record disablement', () => {
            const tracker = MemberChangeTracker.create().disabled();

            expect(tracker.disabledOn).toBeDefined();
            expect(tracker.isEnabled).toBe(false);
        });

        it('should use most recent enablement state', () => {
            const tracker = MemberChangeTracker.create()
                .disabled()
                .enabled()
                .disabled();

            expect(tracker.isEnabled).toBe(false);
        });
    });

    describe('equality', () => {
        it('should be equal when all dates match', () => {
            const t1 = MemberChangeTracker.create();
            const t2 = MemberChangeTracker.create();

            expect(t1.equals(t2)).toBe(true);
        });
    });
});

describe('Member (via ProductOwner)', () => {
    const tenant = Tenant.of('tenant-1');
    const productId = ProductId.of('p1');
    const teamId = TeamId.of('team1');

    function newMember() {
        return new ProductOwner('tenant-1', 'jdoe', 'John', 'Doe', 'john.doe@example.com');
    }

    describe('properties', () => {
        it('should expose member properties', () => {
            const member = newMember();

            expect(member.tenantId).toBe('tenant-1');
            expect(member.username).toBe('jdoe');
            expect(member.firstName).toBe('John');
            expect(member.lastName).toBe('Doe');
            expect(member.fullName).toBe('John Doe');
            expect(member.emailAddress).toBe('john.doe@example.com');
            expect(member.isEnabled).toBe(true);
            expect(member.memberType).toBe(MemberType.ProductOwner);
        });
    });

    describe('changeEmailAddress', () => {
        it('should return event when email changes', () => {
            const member = newMember();
            const event = member.changeEmailAddress(tenant, productId, teamId, 'new@example.com');

            expect(event).toBeInstanceOf(TeamMemberEmailAddressChanged);
            expect(event!.emailAddress).toBe('new@example.com');
            expect(event!.memberId).toBe('jdoe');
            expect(event!.memberType).toBe(MemberType.ProductOwner);
        });

        it('should return undefined when email unchanged', () => {
            const member = newMember();
            const event = member.changeEmailAddress(tenant, productId, teamId, 'john.doe@example.com');

            expect(event).toBeUndefined();
        });

        it('should throw error for empty email', () => {
            const member = newMember();

            expect(() => member.changeEmailAddress(tenant, productId, teamId, '')).toThrow('Email address cannot be empty');
        });
    });

    describe('changeName', () => {
        it('should return event when name changes', () => {
            const member = newMember();
            const event = member.changeName(tenant, productId, teamId, 'Jane', 'Smith');

            expect(event).toBeInstanceOf(TeamMemberNameChanged);
            expect(event!.firstName).toBe('Jane');
            expect(event!.lastName).toBe('Smith');
            expect(event!.memberType).toBe(MemberType.ProductOwner);
        });

        it('should return undefined when name unchanged', () => {
            const member = newMember();
            const event = member.changeName(tenant, productId, teamId, 'John', 'Doe');

            expect(event).toBeUndefined();
        });

        it('should throw error for empty first name', () => {
            const member = newMember();

            expect(() => member.changeName(tenant, productId, teamId, '', 'Doe')).toThrow('First name cannot be empty');
        });

        it('should throw error for empty last name', () => {
            const member = newMember();

            expect(() => member.changeName(tenant, productId, teamId, 'John', '')).toThrow('Last name cannot be empty');
        });
    });

    describe('enable/disable', () => {
        it('should return undefined when already enabled', () => {
            const member = newMember();
            const event = member.enable(tenant, productId, teamId);

            expect(event).toBeUndefined();
        });

        it('should return event when disabled', () => {
            const member = newMember();
            const event = member.disable(tenant, productId, teamId);

            expect(event).toBeInstanceOf(TeamMemberDisabled);
            expect(event!.memberId).toBe('jdoe');
            expect(event!.memberType).toBe(MemberType.ProductOwner);
        });

        it('should return event when enabling a disabled member', () => {
            const member = newMember();
            member.applyDisabled();
            const event = member.enable(tenant, productId, teamId);

            expect(event).toBeInstanceOf(TeamMemberEnabled);
        });

        it('should return undefined when disabling an already disabled member', () => {
            const member = newMember();
            member.applyDisabled();
            const event = member.disable(tenant, productId, teamId);

            expect(event).toBeUndefined();
        });
    });

    describe('apply mutations', () => {
        it('should apply email address change', () => {
            const member = newMember();
            member.applyEmailAddressChanged('new@example.com');

            expect(member.emailAddress).toBe('new@example.com');
        });

        it('should apply name change', () => {
            const member = newMember();
            member.applyNameChanged('Jane', 'Smith');

            expect(member.firstName).toBe('Jane');
            expect(member.lastName).toBe('Smith');
        });

        it('should apply enabled', () => {
            const member = newMember();
            member.applyDisabled();
            expect(member.isEnabled).toBe(false);

            member.applyEnabled();
            expect(member.isEnabled).toBe(true);
        });

        it('should apply disabled', () => {
            const member = newMember();
            member.applyDisabled();

            expect(member.isEnabled).toBe(false);
        });
    });

    describe('equality', () => {
        it('should be equal when tenantId and username match', () => {
            const m1 = new ProductOwner('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const m2 = new TeamMember('t1', 'jdoe', 'Jane', 'Smith', 'jane@example.com');

            expect(m1.equals(m2)).toBe(true);
        });

        it('should not be equal when usernames differ', () => {
            const m1 = new ProductOwner('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const m2 = new ProductOwner('t1', 'jsmith', 'John', 'Doe', 'john@example.com');

            expect(m1.equals(m2)).toBe(false);
        });

        it('should not be equal when tenantIds differ', () => {
            const m1 = new ProductOwner('t1', 'jdoe', 'John', 'Doe', 'john@example.com');
            const m2 = new ProductOwner('t2', 'jdoe', 'John', 'Doe', 'john@example.com');

            expect(m1.equals(m2)).toBe(false);
        });
    });
});
