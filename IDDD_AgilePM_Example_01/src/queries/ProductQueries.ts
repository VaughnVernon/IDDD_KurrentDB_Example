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
import { type ProductDetailView } from './views/ProductDetailView';
import { type ProductSummaryView } from './views/ProductSummaryView';
import { type TenantProductIndexView } from './views/TenantIndexView';

const DETAIL_VIEW_TYPE = 'ProductDetailView';
const INDEX_TYPE = 'TenantProductIndexView';

/**
 * Query service for Product read models.
 * Reads from DocumentStore to serve product queries.
 */
export class ProductQueries {
    constructor(private readonly documentStore: DocumentStore) {}

    private viewId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    async productById(tenantId: string, productId: string): Promise<ProductDetailView | null> {
        const id = this.viewId(tenantId, productId);
        const result = await this.documentStore.read<ProductDetailView>(id, DETAIL_VIEW_TYPE);
        return result.state;
    }

    async allProducts(tenantId: string): Promise<ProductSummaryView[]> {
        const result = await this.documentStore.read<TenantProductIndexView>(tenantId, INDEX_TYPE);
        return result.state?.products ?? [];
    }
}
