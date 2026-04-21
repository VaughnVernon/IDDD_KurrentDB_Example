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
import { type ReleaseDetailView } from './views/ReleaseDetailView';
import { type ReleaseSummaryView } from './views/ReleaseSummaryView';
import { type ProductReleaseIndexView } from './views/ProductIndexView';

const DETAIL_VIEW_TYPE = 'ReleaseDetailView';
const INDEX_TYPE = 'ProductReleaseIndexView';

/**
 * Query service for Release read models.
 * Reads from DocumentStore to serve release queries.
 */
export class ReleaseQueries {
    constructor(private readonly documentStore: DocumentStore) {}

    private viewId(tenantId: string, releaseId: string): string {
        return `${tenantId}:${releaseId}`;
    }

    private indexId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    async releaseById(tenantId: string, releaseId: string): Promise<ReleaseDetailView | null> {
        const id = this.viewId(tenantId, releaseId);
        const result = await this.documentStore.read<ReleaseDetailView>(id, DETAIL_VIEW_TYPE);
        return result.state;
    }

    async productReleases(tenantId: string, productId: string): Promise<ReleaseSummaryView[]> {
        const id = this.indexId(tenantId, productId);
        const result = await this.documentStore.read<ProductReleaseIndexView>(id, INDEX_TYPE);
        return result.state?.releases ?? [];
    }

    async activeProductReleases(tenantId: string, productId: string): Promise<ReleaseSummaryView[]> {
        const releases = await this.productReleases(tenantId, productId);
        return releases.filter(r => !r.archived);
    }
}
