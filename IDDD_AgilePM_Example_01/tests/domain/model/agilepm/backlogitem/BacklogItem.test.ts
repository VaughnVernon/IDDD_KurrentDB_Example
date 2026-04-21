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
import { type BacklogItem, BacklogItem } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItem';
import { BacklogItemId } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemId';
import { BacklogItemType } from '../../../../../src/domain/model/agilepm/backlogitem/BacklogItemType';
import { TaskId } from '../../../../../src/domain/model/agilepm/backlogitem/TaskId';
import { TaskStatus } from '../../../../../src/domain/model/agilepm/backlogitem/TaskStatus';
import { StoryPoints } from '../../../../../src/domain/model/agilepm/backlogitem/StoryPoints';
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';
import { SprintId } from '../../../../../src/domain/model/agilepm/sprint/SprintId';
import { ReleaseId } from '../../../../../src/domain/model/agilepm/release/ReleaseId';
import { TeamMemberId } from '../../../../../src/domain/model/agilepm/team/TeamMemberId';
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';
import { BusinessPriority } from '../../../../../src/domain/model/agilepm/backlogitem/BusinessPriority';
import { registerAgilePMEventAdapters } from '../../../../../src/infrastructure/persistence/EventAdapterRegistration';

// Journal key used by domo-tactical - must match contextName() default of 'default'
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

describe('BacklogItem', () => {
    let journal: Journal<string>;
    let tenant: Tenant;
    let productId: ProductId;
    let backlogItemId: BacklogItemId;

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
        backlogItemId = BacklogItemId.unique();
    });

    async function newBacklogItem(): Promise<BacklogItem> {
        return BacklogItem.plan(
            tenant,
            productId,
            backlogItemId,
            'Implement user login',
            'As a user, I want to log in so that I can access my account',
            BacklogItemType.Feature
        );
    }

    describe('plan', () => {
        it('should apply BacklogItemPlanned event with correct properties', async () => {
            await newBacklogItem();
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);

            const event = events[0];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.summary).toBe('Implement user login');
            expect(event.story).toBe('As a user, I want to log in so that I can access my account');
            expect(event.type).toBe(BacklogItemType.Feature);
        });

        it('should throw error when summary is empty', async () => {
            await expect(async () => BacklogItem.plan(tenant, productId, backlogItemId, '', 'Story', BacklogItemType.Feature))
                .rejects.toThrow('Summary cannot be empty');
        });
    });

    describe('commitTo', () => {
        it('should apply BacklogItemCommitted event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            // Must be scheduled before committing
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);

            const sprintId = SprintId.unique();
            await backlogItem.commitTo(sprintId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.sprintId).toBe(sprintId.id);
        });

        it('should throw error when already committed', async () => {
            const backlogItem = await newBacklogItem();
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);
            const sprintId = SprintId.unique();
            await backlogItem.commitTo(sprintId);

            await expect(backlogItem.commitTo(sprintId))
                .rejects.toThrow('Backlog item is already committed');
        });

        it('should throw error when not scheduled for release', async () => {
            const backlogItem = await newBacklogItem();
            const sprintId = SprintId.unique();

            await expect(backlogItem.commitTo(sprintId))
                .rejects.toThrow('Must be scheduled for release to commit to sprint');
        });
    });

    describe('uncommit', () => {
        it('should apply BacklogItemUncommitted event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            // Must be scheduled before committing
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);

            const sprintId = SprintId.unique();
            await backlogItem.commitTo(sprintId);
            await backlogItem.uncommit();

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(4);

            const event = events[3];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.sprintId).toBe(sprintId.id);
        });

        it('should throw error when not committed', async () => {
            const backlogItem = await newBacklogItem();

            await expect(backlogItem.uncommit())
                .rejects.toThrow('Backlog item is not committed');
        });
    });

    describe('scheduleTo', () => {
        it('should apply BacklogItemScheduled event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.releaseId).toBe(releaseId.id);
        });

        it('should throw error when already scheduled', async () => {
            const backlogItem = await newBacklogItem();
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);

            await expect(backlogItem.scheduleTo(releaseId))
                .rejects.toThrow('Backlog item is already scheduled to a release');
        });
    });

    describe('unschedule', () => {
        it('should apply BacklogItemUnscheduled event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);
            await backlogItem.unschedule();

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.releaseId).toBe(releaseId.id);
        });

        it('should throw error when not scheduled', async () => {
            const backlogItem = await newBacklogItem();

            await expect(backlogItem.unschedule())
                .rejects.toThrow('Backlog item is not scheduled to any release');
        });
    });

    describe('assignStoryPoints', () => {
        it('should apply BacklogItemStoryPointsAssigned event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const storyPoints = StoryPoints.of(5);
            await backlogItem.assignStoryPoints(storyPoints);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.storyPoints).toBe(5);
        });
    });

    describe('changeType', () => {
        it('should apply BacklogItemTypeChanged event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.changeType(BacklogItemType.Defect);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.type).toBe(BacklogItemType.Defect);
        });

        it('should not apply event when type is unchanged', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.changeType(BacklogItemType.Feature);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
        });
    });

    describe('defineTask', () => {
        it('should apply TaskDefined event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Implement login form', 'Create the HTML/CSS for the login form');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.name).toBe('Implement login form');
            expect(event.description).toBe('Create the HTML/CSS for the login form');
        });

        it('should throw error when task already exists', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task 1', 'Description');

            await expect(backlogItem.defineTask(taskId, 'Task 2', 'Description'))
                .rejects.toThrow('Task already exists');
        });

        it('should throw error when name is empty', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.defineTask(taskId, '', 'Description'))
                .rejects.toThrow('Task name cannot be empty');
        });
    });

    describe('describeTask', () => {
        it('should apply TaskDescribed event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Original description');
            await backlogItem.describeTask(taskId, 'Updated description');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.description).toBe('Updated description');
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.describeTask(taskId, 'Description'))
                .rejects.toThrow('Task not found');
        });
    });

    describe('estimateTaskHours', () => {
        it('should apply TaskHoursEstimated event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.estimateTaskHours(taskId, 8, 8);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.hoursEstimated).toBe(8);
            expect(event.hoursRemaining).toBe(8);
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.estimateTaskHours(taskId, 8, 8))
                .rejects.toThrow('Task not found');
        });

        it('should throw error when hours estimated is negative', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');

            await expect(backlogItem.estimateTaskHours(taskId, -1, 0))
                .rejects.toThrow('Hours estimated cannot be negative');
        });

        it('should throw error when hours remaining is negative', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');

            await expect(backlogItem.estimateTaskHours(taskId, 8, -1))
                .rejects.toThrow('Hours remaining cannot be negative');
        });

        it('should throw error when hours remaining exceeds hours estimated', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');

            await expect(backlogItem.estimateTaskHours(taskId, 8, 10))
                .rejects.toThrow('Hours remaining cannot exceed hours estimated');
        });
    });

    describe('changeTaskStatus', () => {
        it('should apply TaskStatusChanged event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.changeTaskStatus(taskId, TaskStatus.InProgress);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.status).toBe(TaskStatus.InProgress);
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.changeTaskStatus(taskId, TaskStatus.InProgress))
                .rejects.toThrow('Task not found');
        });

        it('should not apply event when status is unchanged', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.changeTaskStatus(taskId, TaskStatus.NotStarted);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);
        });
    });

    describe('assignTaskVolunteer', () => {
        it('should apply TaskVolunteerAssigned event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            const volunteerId = TeamMemberId.of('tenant-1', 'volunteer-1');
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.assignTaskVolunteer(taskId, volunteerId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.volunteerId).toBe(volunteerId.toString());
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            const volunteerId = TeamMemberId.of('tenant-1', 'volunteer-1');

            await expect(backlogItem.assignTaskVolunteer(taskId, volunteerId))
                .rejects.toThrow('Task not found');
        });
    });

    describe('summarize', () => {
        it('should apply BacklogItemSummarized event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.summarize('Updated summary');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.summary).toBe('Updated summary');
        });

        it('should throw error when summary is empty', async () => {
            const backlogItem = await newBacklogItem();

            await expect(backlogItem.summarize(''))
                .rejects.toThrow('Summary cannot be empty');
        });

        it('should not apply event when summary is unchanged', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.summarize('Implement user login');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.markAsRemoved();

            await expect(backlogItem.summarize('New summary'))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('tellStory', () => {
        it('should apply BacklogItemStoryTold event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.tellStory('Updated story');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.story).toBe('Updated story');
        });

        it('should not apply event when story is unchanged', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.tellStory('As a user, I want to log in so that I can access my account');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(1);
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.markAsRemoved();

            await expect(backlogItem.tellStory('New story'))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('markAsRemoved', () => {
        it('should apply BacklogItemMarkedAsRemoved event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.markAsRemoved();

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
        });

        it('should throw error when already removed', async () => {
            const backlogItem = await newBacklogItem();

            await backlogItem.markAsRemoved();

            await expect(backlogItem.markAsRemoved())
                .rejects.toThrow('Already removed, not outstanding');
        });

        it('should throw error when already done', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            // Setting hours to 0 will auto-transition to DONE
            await backlogItem.estimateTaskHours(taskId, 0, 0);

            await expect(backlogItem.markAsRemoved())
                .rejects.toThrow('Already done, not outstanding');
        });
    });

    describe('requestDiscussion', () => {
        it('should apply BacklogItemDiscussionRequested event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.requestDiscussion();

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.productId).toBe(productId.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            // Date is serialized as ISO string in JSON
            expect(typeof event.requestedOn).toBe('string');
        });

        it('should not apply event when discussion already requested', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.requestDiscussion();
            await backlogItem.requestDiscussion();

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.markAsRemoved();

            await expect(backlogItem.requestDiscussion())
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('attachDiscussion', () => {
        it('should apply BacklogItemDiscussionAttached event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.attachDiscussion('discussion-123');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.discussionId).toBe('discussion-123');
        });

        it('should throw error when discussion ID is empty', async () => {
            const backlogItem = await newBacklogItem();

            await expect(backlogItem.attachDiscussion(''))
                .rejects.toThrow('Discussion ID cannot be empty');
        });

        it('should throw error when discussion already attached', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.attachDiscussion('discussion-123');

            await expect(backlogItem.attachDiscussion('discussion-456'))
                .rejects.toThrow('Discussion already attached');
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.markAsRemoved();

            await expect(backlogItem.attachDiscussion('discussion-123'))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('assignBusinessPriority', () => {
        it('should apply BacklogItemBusinessPriorityAssigned event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            await backlogItem.assignBusinessPriority(BusinessPriority.of(8, 5, 3, 2));

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);

            const event = events[1];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.benefit).toBe(8);
            expect(event.penalty).toBe(5);
            expect(event.cost).toBe(3);
            expect(event.risk).toBe(2);
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            await backlogItem.markAsRemoved();

            await expect(backlogItem.assignBusinessPriority(8, 5, 3, 2))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('renameTask', () => {
        it('should apply TaskRenamed event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Original name', 'Description');
            await backlogItem.renameTask(taskId, 'New name');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
            expect(event.name).toBe('New name');
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.renameTask(taskId, 'New name'))
                .rejects.toThrow('Task not found');
        });

        it('should throw error when name is empty', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');

            await expect(backlogItem.renameTask(taskId, ''))
                .rejects.toThrow('Task name cannot be empty');
        });

        it('should not apply event when name is unchanged', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task name', 'Description');
            await backlogItem.renameTask(taskId, 'Task name');

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(2);
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.markAsRemoved();

            await expect(backlogItem.renameTask(taskId, 'New name'))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('removeTask', () => {
        it('should apply TaskRemoved event with correct properties', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();

            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.removeTask(taskId);

            const events = await readEvents(journal, streamName);
            expect(events).toHaveLength(3);

            const event = events[2];
            expect(event.tenantId).toBe(tenant.id);
            expect(event.backlogItemId).toBe(backlogItemId.id);
            expect(event.taskId).toBe(taskId.id);
        });

        it('should throw error when task not found', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();

            await expect(backlogItem.removeTask(taskId))
                .rejects.toThrow('Task not found');
        });

        it('should throw error when backlog item is removed', async () => {
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.markAsRemoved();

            await expect(backlogItem.removeTask(taskId))
                .rejects.toThrow('Backlog item has been removed');
        });
    });

    describe('BacklogItem.streamNameFor', () => {
        it('should generate correct stream name', () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const expectedStreamName = `BacklogItem-${tenant.id}-${backlogItemId.id}`;
            expect(streamName).toBe(expectedStreamName);
        });
    });

    describe('validation rules', () => {
        it('should throw error when summary exceeds 100 characters', async () => {
            const longSummary = 'a'.repeat(101);
            await expect(BacklogItem.plan(
                tenant,
                productId,
                backlogItemId,
                longSummary,
                'Story',
                BacklogItemType.Feature
            )).rejects.toThrow('Summary must be 100 characters or less');
        });

        it('should throw error when story exceeds 65000 characters', async () => {
            const longStory = 'a'.repeat(65001);
            await expect(BacklogItem.plan(
                tenant,
                productId,
                backlogItemId,
                'Summary',
                longStory,
                BacklogItemType.Feature
            )).rejects.toThrow('Story must be 65000 characters or less');
        });

        it('should accept summary at exactly 100 characters', async () => {
            const exactSummary = 'a'.repeat(100);
            const backlogItem = await BacklogItem.plan(
                tenant,
                productId,
                backlogItemId,
                exactSummary,
                'Story',
                BacklogItemType.Feature
            );
            expect(backlogItem).toBeDefined();
        });
    });

    describe('unschedule invariants', () => {
        it('should throw error when trying to unschedule while committed', async () => {
            const backlogItem = await newBacklogItem();
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);
            const sprintId = SprintId.unique();
            await backlogItem.commitTo(sprintId);

            await expect(backlogItem.unschedule())
                .rejects.toThrow('Must first uncommit from sprint');
        });
    });

    describe('auto status transitions', () => {
        it('should transition to DONE when all task hours reach zero', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            await backlogItem.estimateTaskHours(taskId, 8, 8);
            await backlogItem.estimateTaskHours(taskId, 8, 0);

            const events = await readEvents(journal, streamName);
            const statusChangedEvent = events.find(e => e.status === 'DONE');
            expect(statusChangedEvent).toBeDefined();
            expect(statusChangedEvent.previousStatus).toBe('PLANNED');
        });

        it('should regress from DONE when hours are added back', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            // First complete by setting hours to 0
            await backlogItem.estimateTaskHours(taskId, 8, 0);
            // Then add hours back
            await backlogItem.estimateTaskHours(taskId, 8, 4);

            const events = await readEvents(journal, streamName);
            const statusChangedEvents = events.filter(e => e.previousStatus !== undefined);
            expect(statusChangedEvents.length).toBeGreaterThanOrEqual(2);
            const lastStatusChange = statusChangedEvents[statusChangedEvents.length - 1];
            expect(lastStatusChange.previousStatus).toBe('DONE');
            expect(lastStatusChange.status).toBe('PLANNED');
        });

        it('should regress to COMMITTED when hours added back while committed', async () => {
            const streamName = BacklogItem.streamNameFor(tenant, backlogItemId);
            const backlogItem = await newBacklogItem();
            const releaseId = ReleaseId.unique();
            await backlogItem.scheduleTo(releaseId);
            const sprintId = SprintId.unique();
            await backlogItem.commitTo(sprintId);
            const taskId = TaskId.unique();
            await backlogItem.defineTask(taskId, 'Task', 'Description');
            // Complete by setting hours to 0
            await backlogItem.estimateTaskHours(taskId, 8, 0);
            // Then add hours back
            await backlogItem.estimateTaskHours(taskId, 8, 4);

            const events = await readEvents(journal, streamName);
            const statusChangedEvents = events.filter(e => e.previousStatus !== undefined);
            const lastStatusChange = statusChangedEvents[statusChangedEvents.length - 1];
            expect(lastStatusChange.previousStatus).toBe('DONE');
            expect(lastStatusChange.status).toBe('COMMITTED');
        });
    });
});
