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

import { Actor } from 'domo-actors';
import { type Projection, type Projectable, type ProjectionControl, type DocumentStore } from 'domo-tactical';
import { type BacklogItemDetailView, type TaskView } from '../views/BacklogItemDetailView';
import { type BacklogItemSummaryView } from '../views/BacklogItemSummaryView';

const DETAIL_VIEW_TYPE = 'BacklogItemDetailView';
const SUMMARY_VIEW_TYPE = 'BacklogItemSummaryView';

/**
 * Projection that maintains BacklogItemDetailView and BacklogItemSummaryView.
 * Handles all BacklogItem-related events.
 */
export class BacklogItemProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    case 'BacklogItemPlanned':
                        await this.onBacklogItemPlanned(eventData);
                        break;
                    case 'BacklogItemCommitted':
                        await this.onBacklogItemCommitted(eventData);
                        break;
                    case 'BacklogItemUncommitted':
                        await this.onBacklogItemUncommitted(eventData);
                        break;
                    case 'BacklogItemScheduled':
                        await this.onBacklogItemScheduled(eventData);
                        break;
                    case 'BacklogItemUnscheduled':
                        await this.onBacklogItemUnscheduled(eventData);
                        break;
                    case 'BacklogItemStoryPointsAssigned':
                        await this.onBacklogItemStoryPointsAssigned(eventData);
                        break;
                    case 'BacklogItemTypeChanged':
                        await this.onBacklogItemTypeChanged(eventData);
                        break;
                    case 'TaskDefined':
                        await this.onTaskDefined(eventData);
                        break;
                    case 'TaskDescribed':
                        await this.onTaskDescribed(eventData);
                        break;
                    case 'TaskHoursEstimated':
                        await this.onTaskHoursEstimated(eventData);
                        break;
                    case 'TaskStatusChanged':
                        await this.onTaskStatusChanged(eventData);
                        break;
                    case 'TaskVolunteerAssigned':
                        await this.onTaskVolunteerAssigned(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private viewId(tenantId: string, backlogItemId: string): string {
        return `${tenantId}:${backlogItemId}`;
    }

    private async onBacklogItemPlanned(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
        summary: string;
        story: string;
        type: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailView: BacklogItemDetailView = {
            tenantId: event.tenantId,
            productId: event.productId,
            backlogItemId: event.backlogItemId,
            summary: event.summary,
            story: event.story,
            type: event.type,
            status: 'Planned',
            storyPoints: null,
            sprintId: null,
            releaseId: null,
            tasks: []
        };

        const summaryView: BacklogItemSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            backlogItemId: event.backlogItemId,
            summary: event.summary,
            type: event.type,
            status: 'Planned',
            storyPoints: null,
            taskCount: 0
        };

        await this.documentStore.write(id, DETAIL_VIEW_TYPE, detailView, 1);
        await this.documentStore.write(id, SUMMARY_VIEW_TYPE, summaryView, 1);
    }

    private async onBacklogItemCommitted(event: {
        tenantId: string;
        backlogItemId: string;
        sprintId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = { ...detailResult.state, sprintId: event.sprintId, status: 'Committed' };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = { ...summaryResult.state, status: 'Committed' };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onBacklogItemUncommitted(event: {
        tenantId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const newStatus = detailResult.state.releaseId ? 'Scheduled' : 'Planned';
            const updated = { ...detailResult.state, sprintId: null, status: newStatus };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const detailState = (await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE)).state;
            const newStatus = detailState?.releaseId ? 'Scheduled' : 'Planned';
            const updated = { ...summaryResult.state, status: newStatus };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onBacklogItemScheduled(event: {
        tenantId: string;
        backlogItemId: string;
        releaseId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const newStatus = detailResult.state.status === 'Planned' ? 'Scheduled' : detailResult.state.status;
            const updated = { ...detailResult.state, releaseId: event.releaseId, status: newStatus };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state && summaryResult.state.status === 'Planned') {
            const updated = { ...summaryResult.state, status: 'Scheduled' };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onBacklogItemUnscheduled(event: {
        tenantId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const newStatus = detailResult.state.status === 'Scheduled' ? 'Planned' : detailResult.state.status;
            const updated = { ...detailResult.state, releaseId: null, status: newStatus };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state && summaryResult.state.status === 'Scheduled') {
            const updated = { ...summaryResult.state, status: 'Planned' };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onBacklogItemStoryPointsAssigned(event: {
        tenantId: string;
        backlogItemId: string;
        storyPoints: number;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = { ...detailResult.state, storyPoints: event.storyPoints };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = { ...summaryResult.state, storyPoints: event.storyPoints };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onBacklogItemTypeChanged(event: {
        tenantId: string;
        backlogItemId: string;
        type: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = { ...detailResult.state, type: event.type };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = { ...summaryResult.state, type: event.type };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onTaskDefined(event: {
        tenantId: string;
        backlogItemId: string;
        taskId: string;
        name: string;
        description: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const task: TaskView = {
            taskId: event.taskId,
            name: event.name,
            description: event.description,
            status: 'NotStarted',
            hoursEstimated: 0,
            hoursRemaining: 0,
            volunteerId: null
        };

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                tasks: [...detailResult.state.tasks, task]
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<BacklogItemSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                taskCount: summaryResult.state.taskCount + 1
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onTaskDescribed(event: {
        tenantId: string;
        backlogItemId: string;
        taskId: string;
        description: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                tasks: detailResult.state.tasks.map(t =>
                    t.taskId === event.taskId ? { ...t, description: event.description } : t
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }
    }

    private async onTaskHoursEstimated(event: {
        tenantId: string;
        backlogItemId: string;
        taskId: string;
        hoursEstimated: number;
        hoursRemaining: number;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                tasks: detailResult.state.tasks.map(t =>
                    t.taskId === event.taskId
                        ? { ...t, hoursEstimated: event.hoursEstimated, hoursRemaining: event.hoursRemaining }
                        : t
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }
    }

    private async onTaskStatusChanged(event: {
        tenantId: string;
        backlogItemId: string;
        taskId: string;
        status: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                tasks: detailResult.state.tasks.map(t =>
                    t.taskId === event.taskId ? { ...t, status: event.status } : t
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }
    }

    private async onTaskVolunteerAssigned(event: {
        tenantId: string;
        backlogItemId: string;
        taskId: string;
        volunteerId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.backlogItemId);

        const detailResult = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                tasks: detailResult.state.tasks.map(t =>
                    t.taskId === event.taskId ? { ...t, volunteerId: event.volunteerId } : t
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }
    }
}
