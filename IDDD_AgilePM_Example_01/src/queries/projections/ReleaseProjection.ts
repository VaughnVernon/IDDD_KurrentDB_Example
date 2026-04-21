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
import { type ReleaseDetailView, type ScheduledBacklogItemView } from '../views/ReleaseDetailView';
import { type ReleaseSummaryView } from '../views/ReleaseSummaryView';

const DETAIL_VIEW_TYPE = 'ReleaseDetailView';
const SUMMARY_VIEW_TYPE = 'ReleaseSummaryView';

/**
 * Projection that maintains ReleaseDetailView and ReleaseSummaryView.
 * Handles all Release-related events.
 */
export class ReleaseProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    case 'ReleaseScheduled':
                        await this.onReleaseScheduled(eventData);
                        break;
                    case 'ReleaseArchived':
                        await this.onReleaseArchived(eventData);
                        break;
                    case 'ReleaseBacklogItemScheduled':
                        await this.onReleaseBacklogItemScheduled(eventData);
                        break;
                    case 'ReleaseBacklogItemUnscheduled':
                        await this.onReleaseBacklogItemUnscheduled(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private viewId(tenantId: string, releaseId: string): string {
        return `${tenantId}:${releaseId}`;
    }

    private async onReleaseScheduled(event: {
        tenantId: string;
        productId: string;
        releaseId: string;
        name: string;
        description: string;
        begins: string;
        ends: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.releaseId);

        const detailView: ReleaseDetailView = {
            tenantId: event.tenantId,
            productId: event.productId,
            releaseId: event.releaseId,
            name: event.name,
            description: event.description,
            begins: event.begins,
            ends: event.ends,
            archived: false,
            scheduledBacklogItems: []
        };

        const summaryView: ReleaseSummaryView = {
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

        await this.documentStore.write(id, DETAIL_VIEW_TYPE, detailView, 1);
        await this.documentStore.write(id, SUMMARY_VIEW_TYPE, summaryView, 1);
    }

    private async onReleaseArchived(event: {
        tenantId: string;
        releaseId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.releaseId);

        const detailResult = await this.documentStore.read<ReleaseDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = { ...detailResult.state, archived: true };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<ReleaseSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = { ...summaryResult.state, archived: true };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onReleaseBacklogItemScheduled(event: {
        tenantId: string;
        releaseId: string;
        backlogItemId: string;
        ordering: number;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.releaseId);

        const scheduledItem: ScheduledBacklogItemView = {
            backlogItemId: event.backlogItemId,
            ordering: event.ordering
        };

        const detailResult = await this.documentStore.read<ReleaseDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                scheduledBacklogItems: [...detailResult.state.scheduledBacklogItems, scheduledItem]
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<ReleaseSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                scheduledItemCount: summaryResult.state.scheduledItemCount + 1
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onReleaseBacklogItemUnscheduled(event: {
        tenantId: string;
        releaseId: string;
        backlogItemId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.releaseId);

        const detailResult = await this.documentStore.read<ReleaseDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                scheduledBacklogItems: detailResult.state.scheduledBacklogItems.filter(
                    item => item.backlogItemId !== event.backlogItemId
                )
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<ReleaseSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                scheduledItemCount: Math.max(0, summaryResult.state.scheduledItemCount - 1)
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }
}
