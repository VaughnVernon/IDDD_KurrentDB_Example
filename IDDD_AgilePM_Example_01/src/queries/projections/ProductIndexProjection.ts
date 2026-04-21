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
import {
    type ProductSprintIndexView,
    type ProductReleaseIndexView,
    type ProductBacklogItemIndexView
} from '../views/ProductIndexView';
import { type SprintSummaryView } from '../views/SprintSummaryView';
import { type ReleaseSummaryView } from '../views/ReleaseSummaryView';
import { type BacklogItemSummaryView } from '../views/BacklogItemSummaryView';

const SPRINT_INDEX_TYPE = 'ProductSprintIndexView';
const RELEASE_INDEX_TYPE = 'ProductReleaseIndexView';
const BACKLOG_ITEM_INDEX_TYPE = 'ProductBacklogItemIndexView';

/**
 * Projection that maintains product-level index views with summaries
 * for Sprints, Releases, and BacklogItems.
 */
export class ProductIndexProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    // Sprint events
                    case 'SprintPlanned':
                        await this.onSprintPlanned(eventData);
                        break;

                    // Release events
                    case 'ReleaseScheduled':
                        await this.onReleaseScheduled(eventData);
                        break;
                    case 'ReleaseArchived':
                        await this.onReleaseArchived(eventData);
                        break;

                    // BacklogItem events
                    case 'BacklogItemPlanned':
                        await this.onBacklogItemPlanned(eventData);
                        break;
                    case 'BacklogItemStoryPointsAssigned':
                        await this.onBacklogItemStoryPointsAssigned(eventData);
                        break;
                    case 'BacklogItemTypeChanged':
                        await this.onBacklogItemTypeChanged(eventData);
                        break;
                    case 'BacklogItemCommitted':
                        await this.onBacklogItemStatusChanged(eventData, 'Committed');
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
                    case 'TaskDefined':
                        await this.onTaskDefined(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private indexId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    // Sprint handlers

    private async onSprintPlanned(event: {
        tenantId: string;
        productId: string;
        sprintId: string;
        name: string;
        goals: string;
        begins: string;
        ends: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const summary: SprintSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            sprintId: event.sprintId,
            name: event.name,
            goals: event.goals,
            begins: event.begins,
            ends: event.ends,
            committedItemCount: 0
        };

        const result = await this.documentStore.read<ProductSprintIndexView>(id, SPRINT_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                sprints: [...result.state.sprints, summary]
            };
            await this.documentStore.write(id, SPRINT_INDEX_TYPE, updated, result.stateVersion + 1);
        } else {
            const indexView: ProductSprintIndexView = {
                tenantId: event.tenantId,
                productId: event.productId,
                sprints: [summary]
            };
            await this.documentStore.write(id, SPRINT_INDEX_TYPE, indexView, 1);
        }
    }

    // Release handlers

    private async onReleaseScheduled(event: {
        tenantId: string;
        productId: string;
        releaseId: string;
        name: string;
        description: string;
        begins: string;
        ends: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const summary: ReleaseSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            releaseId: event.releaseId,
            name: event.name,
            description: event.description,
            begins: event.begins,
            ends: event.ends,
            archived: false,
            scheduledItemCount: 0
        };

        const result = await this.documentStore.read<ProductReleaseIndexView>(id, RELEASE_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                releases: [...result.state.releases, summary]
            };
            await this.documentStore.write(id, RELEASE_INDEX_TYPE, updated, result.stateVersion + 1);
        } else {
            const indexView: ProductReleaseIndexView = {
                tenantId: event.tenantId,
                productId: event.productId,
                releases: [summary]
            };
            await this.documentStore.write(id, RELEASE_INDEX_TYPE, indexView, 1);
        }
    }

    private async onReleaseArchived(event: {
        tenantId: string;
        productId: string;
        releaseId: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductReleaseIndexView>(id, RELEASE_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                releases: result.state.releases.map(r =>
                    r.releaseId === event.releaseId ? { ...r, archived: true } : r
                )
            };
            await this.documentStore.write(id, RELEASE_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    // BacklogItem handlers

    private async onBacklogItemPlanned(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
        summary: string;
        type: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
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

        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: [...result.state.backlogItems, summaryView]
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        } else {
            const indexView: ProductBacklogItemIndexView = {
                tenantId: event.tenantId,
                productId: event.productId,
                backlogItems: [summaryView]
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, indexView, 1);
        }
    }

    private async onBacklogItemStoryPointsAssigned(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
        storyPoints: number;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId
                        ? { ...b, storyPoints: event.storyPoints }
                        : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onBacklogItemTypeChanged(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
        type: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId ? { ...b, type: event.type } : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onBacklogItemStatusChanged(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
    }, status: string): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId ? { ...b, status } : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onBacklogItemUncommitted(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            // Set to Planned (the detail view handles release-based status properly)
            const newStatus = 'Planned';
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId ? { ...b, status: newStatus } : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onBacklogItemScheduled(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId && b.status === 'Planned'
                        ? { ...b, status: 'Scheduled' }
                        : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onBacklogItemUnscheduled(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId && b.status === 'Scheduled'
                        ? { ...b, status: 'Planned' }
                        : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onTaskDefined(event: {
        tenantId: string;
        productId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.indexId(event.tenantId, event.productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, BACKLOG_ITEM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                backlogItems: result.state.backlogItems.map(b =>
                    b.backlogItemId === event.backlogItemId
                        ? { ...b, taskCount: b.taskCount + 1 }
                        : b
                )
            };
            await this.documentStore.write(id, BACKLOG_ITEM_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }
}
