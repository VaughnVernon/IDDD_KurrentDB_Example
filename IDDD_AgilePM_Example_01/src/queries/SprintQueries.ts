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
import { type SprintDetailView } from './views/SprintDetailView';
import { type SprintSummaryView } from './views/SprintSummaryView';
import { type ProductSprintIndexView } from './views/ProductIndexView';

const DETAIL_VIEW_TYPE = 'SprintDetailView';
const INDEX_TYPE = 'ProductSprintIndexView';

/**
 * Query service for Sprint read models.
 * Reads from DocumentStore to serve sprint queries.
 */
export class SprintQueries {
    constructor(private readonly documentStore: DocumentStore) {}

    private viewId(tenantId: string, sprintId: string): string {
        return `${tenantId}:${sprintId}`;
    }

    private indexId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    async sprintById(tenantId: string, sprintId: string): Promise<SprintDetailView | null> {
        const id = this.viewId(tenantId, sprintId);
        const result = await this.documentStore.read<SprintDetailView>(id, DETAIL_VIEW_TYPE);
        return result.state;
    }

    async productSprints(tenantId: string, productId: string): Promise<SprintSummaryView[]> {
        const id = this.indexId(tenantId, productId);
        const result = await this.documentStore.read<ProductSprintIndexView>(id, INDEX_TYPE);
        return result.state?.sprints ?? [];
    }
}
