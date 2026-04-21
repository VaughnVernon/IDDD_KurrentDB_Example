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

import { type DocumentStore } from 'domo-tactical';
import { type BacklogItemDetailView } from './views/BacklogItemDetailView';
import { type BacklogItemSummaryView } from './views/BacklogItemSummaryView';
import { type ProductBacklogItemIndexView } from './views/ProductIndexView';

const DETAIL_VIEW_TYPE = 'BacklogItemDetailView';
const INDEX_TYPE = 'ProductBacklogItemIndexView';

/**
 * Query service for BacklogItem read models.
 * Reads from DocumentStore to serve backlog item queries.
 */
export class BacklogItemQueries {
    constructor(private readonly documentStore: DocumentStore) {}

    private viewId(tenantId: string, backlogItemId: string): string {
        return `${tenantId}:${backlogItemId}`;
    }

    private indexId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    async backlogItemById(tenantId: string, backlogItemId: string): Promise<BacklogItemDetailView | null> {
        const id = this.viewId(tenantId, backlogItemId);
        const result = await this.documentStore.read<BacklogItemDetailView>(id, DETAIL_VIEW_TYPE);
        return result.state;
    }

    async productBacklogItems(tenantId: string, productId: string): Promise<BacklogItemSummaryView[]> {
        const id = this.indexId(tenantId, productId);
        const result = await this.documentStore.read<ProductBacklogItemIndexView>(id, INDEX_TYPE);
        return result.state?.backlogItems ?? [];
    }

    async productBacklogItemsByStatus(tenantId: string, productId: string, status: string): Promise<BacklogItemSummaryView[]> {
        const items = await this.productBacklogItems(tenantId, productId);
        return items.filter(item => item.status === status);
    }

    async productBacklogItemsByType(tenantId: string, productId: string, type: string): Promise<BacklogItemSummaryView[]> {
        const items = await this.productBacklogItems(tenantId, productId);
        return items.filter(item => item.type === type);
    }
}
