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
import { TeamCommands } from '../../src/application/TeamCommands';
import { MemberType } from '../../src/domain/model/agilepm/team/MemberType';
import { registerAgilePMEventAdapters } from '../../src/infrastructure/persistence/EventAdapterRegistration';

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

describe('TeamCommands', () => {
    let journal: Journal<string>;
    let commands: TeamCommands;
    let tenantId: string;
    let productId: string;

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
        commands = new TeamCommands();
        tenantId = `tenant-${Date.now()}-${Math.random()}`;
        productId = `product-${Date.now()}-${Math.random()}`;
    });

    describe('formTeam', () => {
        it('should form a team and return the generated ID', async () => {
            const teamId = await commands.formTeam(tenantId, productId, 'Development Team');

            expect(teamId).toBeDefined();
            expect(typeof teamId).toBe('string');

            const streamName = `Team-${tenantId}-${teamId}`;
            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
            expect(events[0].name).toBe('Development Team');
        });

        it('should generate unique IDs for each team', async () => {
            const id1 = await commands.formTeam(tenantId, productId, 'Team Alpha');
            const id2 = await commands.formTeam(tenantId, productId, 'Team Beta');

            expect(id1).not.toBe(id2);
        });
    });

    describe('registerProductOwner', () => {
        it('should register a product owner and return the username as identity', async () => {
            const teamId = await commands.formTeam(tenantId, productId, 'Dev Team');

            const memberId = await commands.registerProductOwner(
                tenantId, productId, teamId, 'jdoe', 'John', 'Doe', 'john@example.com'
            );

            expect(memberId).toBe('jdoe');
        });
    });

    describe('registerTeamMember', () => {
        it('should register a team member and return the username as identity', async () => {
            const teamId = await commands.formTeam(tenantId, productId, 'Dev Team');

            const memberId = await commands.registerTeamMember(
                tenantId, productId, teamId, 'jdoe', 'John', 'Doe', 'john@example.com'
            );

            expect(memberId).toBe('jdoe');
        });

        it('should return different usernames for different members', async () => {
            const teamId = await commands.formTeam(tenantId, productId, 'Dev Team');

            const id1 = await commands.registerTeamMember(tenantId, productId, teamId, 'user1', 'John', 'Doe', 'j@e.com');
            const id2 = await commands.registerTeamMember(tenantId, productId, teamId, 'user2', 'Jane', 'Doe', 'ja@e.com');

            expect(id1).not.toBe(id2);
        });
    });

    describe('removeMember', () => {
        it('should reject when member does not exist', async () => {
            const teamId = await commands.formTeam(tenantId, productId, 'Dev Team');

            await expect(
                commands.removeMember(tenantId, productId, teamId, 'nonexistent-member')
            ).rejects.toThrow('Member not found in team');
        });
    });
});
