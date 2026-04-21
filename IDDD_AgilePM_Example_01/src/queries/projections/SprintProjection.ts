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
import { type SprintDetailView, type CommittedBacklogItemView } from '../views/SprintDetailView';
import { type SprintSummaryView } from '../views/SprintSummaryView';

const DETAIL_VIEW_TYPE = 'SprintDetailView';
const SUMMARY_VIEW_TYPE = 'SprintSummaryView';

/**
 * Projection that maintains SprintDetailView and SprintSummaryView.
 * Handles all Sprint-related events.
 */
export class SprintProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    case 'SprintPlanned':
                        await this.onSprintPlanned(eventData);
                        break;
                    case 'SprintBacklogItemCommitted':
                        await this.onSprintBacklogItemCommitted(eventData);
                        break;
                    case 'SprintBacklogItemUncommitted':
                        await this.onSprintBacklogItemUncommitted(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private viewId(tenantId: string, sprintId: string): string {
        return `${tenantId}:${sprintId}`;
    }

    private async onSprintPlanned(event: {
        tenantId: string;
        productId: string;
        sprintId: string;
        name: string;
        goals: string;
        begins: string;
        ends: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.sprintId);

        const detailView: SprintDetailView = {
            tenantId: event.tenantId,
            productId: event.productId,
            sprintId: event.sprintId,
            name: event.name,
            goals: event.goals,
            begins: event.begins,
            ends: event.ends,
            committedBacklogItems: []
        };

        const summaryView: SprintSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            sprintId: event.sprintId,
            name: event.name,
            goals: event.goals,
            begins: event.begins,
            ends: event.ends,
            committedItemCount: 0
        };

        await this.documentStore.write(id, DETAIL_VIEW_TYPE, detailView, 1);
        await this.documentStore.write(id, SUMMARY_VIEW_TYPE, summaryView, 1);
    }

    private async onSprintBacklogItemCommitted(event: {
        tenantId: string;
        sprintId: string;
        backlogItemId: string;
        ordering: number;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.sprintId);

        const committedItem: CommittedBacklogItemView = {
            backlogItemId: event.backlogItemId,
            ordering: event.ordering
        };

        const detailResult = await this.documentStore.read<SprintDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                committedBacklogItems: [...detailResult.state.committedBacklogItems, committedItem]
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<SprintSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                committedItemCount: summaryResult.state.committedItemCount + 1
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onSprintBacklogItemUncommitted(event: {
        tenantId: string;
        sprintId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.sprintId);

        const detailResult = await this.documentStore.read<SprintDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                committedBacklogItems: detailResult.state.committedBacklogItems.filter(
                    item => item.backlogItemId !== event.backlogItemId
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<SprintSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                committedItemCount: Math.max(0, summaryResult.state.committedItemCount - 1)
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }
}
