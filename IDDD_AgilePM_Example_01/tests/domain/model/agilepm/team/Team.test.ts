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
import { Team } from '../../../../../src/domain/model/agilepm/team/Team';
import { TeamId } from '../../../../../src/domain/model/agilepm/team/TeamId';
import { MemberType } from '../../../../../src/domain/model/agilepm/team/MemberType';
import { ProductOwner } from '../../../../../src/domain/model/agilepm/team/ProductOwner';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { registerAgilePMEventAdapters } from '../../../../../src/infrastructure/persistence/EventAdapterRegistration';

const JOURNAL_KEY = 'domo-tactical:default.journal';
const SUPERVISOR_NAME = 'test-supervisor';

const supervisorProtocol: Protocol = {
    type: () => SUPERVISOR_NAME,
    instantiator: () => ({
        instantiate: () => new TestJournalSupervisor()
    })
};

const journalProtocol: Protocol = {
    type: () => 'InMemoryJournal',
    instantiator: () => ({
        instantiate: () => new InMemoryJournal<string>()
    })
};

async function readEvents(journal: Journal<string>, streamName: string): Promise<any[]> {
    const reader = await journal.streamReader('test-reader');
    const stream = await reader.streamFor(streamName);
    return stream.entries.map(entry => JSON.parse(entry.entryData));
}

describe('Team', () => {
    let journal: Journal<string>;
    let tenant: Tenant;
    let productId: ProductId;
    let teamId: TeamId;

    beforeAll(() => {
        registerAgilePMEventAdapters();
        stage().actorFor<TestSupervisor>(supervisorProtocol, undefined, 'default');
        journal = stage().actorFor<Journal<string>>(journalProtocol, undefined, SUPERVISOR_NAME);
        stage().registerValue(JOURNAL_KEY, journal);
    });

    afterAll(async () => {
        await stage().close();
    });

    beforeEach(() => {
        tenant = Tenant.unique();
        productId = ProductId.unique();
        teamId = TeamId.generate();
    });

    async function newTeam(): Promise<Team> {
        return Team.form(tenant, productId, teamId, 'Development Team');
    }

    describe('form', () => {
        it('should apply TeamCreated event with correct properties', async () => {
            await newTeam();
            const streamName = Team.streamNameFor(tenant, teamId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.teamId).toBe(teamId.id);
            expect(event.name).toBe('Development Team');
        });

        it('should throw error when name is empty', async () => {
            await expect(async () => Team.form(tenant, productId, teamId, ''))
                .rejects.toThrow('Team name cannot be empty');
        });

        it('should throw error when name is whitespace only', async () => {
            await expect(async () => Team.form(tenant, productId, teamId, '   '))
                .rejects.toThrow('Team name cannot be empty');
        });
    });

    describe('registerMember', () => {
        it('should apply TeamMemberRegistered event for ProductOwner', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();

            await team.registerMember(MemberType.ProductOwner, 'jdoe', 'John', 'Doe', 'john@example.com');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.teamId).toBe(teamId.id);
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.ProductOwner);
            expect(event.username).toBe('jdoe');
            expect(event.firstName).toBe('John');
            expect(event.lastName).toBe('Doe');
            expect(event.emailAddress).toBe('john@example.com');
        });

        it('should apply TeamMemberRegistered event for TeamMember', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();

            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.memberType).toBe(MemberType.TeamMember);
        });

        it('should throw error when member already exists', async () => {
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await expect(team.registerMember(MemberType.TeamMember, 'jdoe', 'Jane', 'Doe', 'jane@example.com'))
                .rejects.toThrow('Member already exists in team');
        });

        it('should throw error when username is empty', async () => {
            const team = await newTeam();

            await expect(team.registerMember(MemberType.TeamMember, '', 'John', 'Doe', 'john@example.com'))
                .rejects.toThrow('Username cannot be empty');
        });

        it('should throw error when first name is empty', async () => {
            const team = await newTeam();

            await expect(team.registerMember(MemberType.TeamMember, 'jdoe', '', 'Doe', 'john@example.com'))
                .rejects.toThrow('First name cannot be empty');
        });

        it('should throw error when last name is empty', async () => {
            const team = await newTeam();

            await expect(team.registerMember(MemberType.TeamMember, 'jdoe', 'John', '', 'john@example.com'))
                .rejects.toThrow('Last name cannot be empty');
        });

        it('should throw error when email address is empty', async () => {
            const team = await newTeam();

            await expect(team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', ''))
                .rejects.toThrow('Email address cannot be empty');
        });
    });

    describe('assignProductOwner', () => {
        it('should apply TeamProductOwnerAssigned event', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.ProductOwner, 'jdoe', 'John', 'Doe', 'john@example.com');

            const po = new ProductOwner(tenant.id, 'jdoe', 'John', 'Doe', 'john@example.com');
            await team.assignProductOwner(po);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.teamId).toBe(teamId.id);
            expect(event.username).toBe('jdoe');
        });

        it('should not apply event when same product owner already assigned', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.ProductOwner, 'jdoe', 'John', 'Doe', 'john@example.com');

            const po = new ProductOwner(tenant.id, 'jdoe', 'John', 'Doe', 'john@example.com');
            await team.assignProductOwner(po);
            await team.assignProductOwner(po);

            const events = await readEvents(journal, streamName);
            // TeamCreated + TeamMemberRegistered + TeamProductOwnerAssigned (only once)
            expect(events).toHaveLength(3);
        });
    });

    describe('changeMemberEmailAddress', () => {
        it('should apply TeamMemberEmailAddressChanged event', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.ProductOwner, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.changeMemberEmailAddress('jdoe', 'john.new@example.com');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.ProductOwner);
            expect(event.emailAddress).toBe('john.new@example.com');
        });

        it('should not apply event when email unchanged', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.changeMemberEmailAddress('jdoe', 'john@example.com');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2); // Only TeamCreated + TeamMemberRegistered
        });

        it('should throw error when member not found', async () => {
            const team = await newTeam();

            await expect(team.changeMemberEmailAddress('nonexistent', 'new@example.com'))
                .rejects.toThrow('Member not found in team');
        });
    });

    describe('changeMemberName', () => {
        it('should apply TeamMemberNameChanged event', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.changeMemberName('jdoe', 'Jane', 'Smith');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.TeamMember);
            expect(event.firstName).toBe('Jane');
            expect(event.lastName).toBe('Smith');
        });

        it('should not apply event when name unchanged', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.changeMemberName('jdoe', 'John', 'Doe');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);
        });
    });

    describe('enableMember', () => {
        it('should apply TeamMemberEnabled event after being disabled', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.ProductOwner, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.disableMember('jdoe');
            await team.enableMember('jdoe');

            const events = await readEvents(journal, streamName);
            // TeamCreated + TeamMemberRegistered + TeamMemberDisabled + TeamMemberEnabled
            expect(events).toHaveLength(4);

            const event = events[3];
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.ProductOwner);
        });

        it('should not apply event when already enabled', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.enableMember('jdoe');

            const events = await readEvents(journal, streamName);
            // Only TeamCreated + TeamMemberRegistered
            expect(events).toHaveLength(2);
        });
    });

    describe('disableMember', () => {
        it('should apply TeamMemberDisabled event', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.disableMember('jdoe');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.TeamMember);
        });

        it('should not apply event when already disabled', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.disableMember('jdoe');
            await team.disableMember('jdoe');

            const events = await readEvents(journal, streamName);
            // TeamCreated + TeamMemberRegistered + TeamMemberDisabled (only once)
            expect(events).toHaveLength(3);
        });
    });

    describe('removeMember', () => {
        it('should apply TeamMemberRemoved event with correct properties', async () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const team = await newTeam();
            await team.registerMember(MemberType.TeamMember, 'jdoe', 'John', 'Doe', 'john@example.com');

            await team.removeMember('jdoe');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.teamId).toBe(teamId.id);
            expect(event.memberId).toBe('jdoe');
            expect(event.memberType).toBe(MemberType.TeamMember);
        });

        it('should throw error when member not found', async () => {
            const team = await newTeam();

            await expect(team.removeMember('nonexistent'))
                .rejects.toThrow('Member not found in team');
        });
    });

    describe('Team.streamNameFor', () => {
        it('should generate correct stream name', () => {
            const streamName = Team.streamNameFor(tenant, teamId);
            const expectedStreamName = `Team-${tenant.id}-${teamId.id}`;
            expect(streamName).toBe(expectedStreamName);
        });
    });
});
