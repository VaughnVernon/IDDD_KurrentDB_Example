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
import { type ProductDetailView } from '../views/ProductDetailView';
import { type ProductSummaryView } from '../views/ProductSummaryView';

const DETAIL_VIEW_TYPE = 'ProductDetailView';
const SUMMARY_VIEW_TYPE = 'ProductSummaryView';

/**
 * Projection that maintains ProductDetailView and ProductSummaryView.
 * Handles all Product-related events.
 */
export class ProductProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    case 'ProductInitiated':
                        await this.onProductInitiated(eventData);
                        break;
                    case 'ProductDescriptionChanged':
                        await this.onProductDescriptionChanged(eventData);
                        break;
                    case 'ProductOwnerChanged':
                        await this.onProductOwnerChanged(eventData);
                        break;
                    case 'ProductDiscussionRequested':
                        await this.onProductDiscussionRequested(eventData);
                        break;
                    case 'ProductDiscussionAttached':
                        await this.onProductDiscussionAttached(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private viewId(tenantId: string, productId: string): string {
        return `${tenantId}:${productId}`;
    }

    private async onProductInitiated(event: {
        tenantId: string;
        productId: string;
        name: string;
        description: string;
        productOwnerId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.productId);

        const detailView: ProductDetailView = {
            tenantId: event.tenantId,
            productId: event.productId,
            name: event.name,
            description: event.description,
            productOwnerId: event.productOwnerId,
            discussionRequested: false,
            discussionId: null
        };

        const summaryView: ProductSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            name: event.name,
            description: event.description
        };

        await this.documentStore.write(id, DETAIL_VIEW_TYPE, detailView, 1);
        await this.documentStore.write(id, SUMMARY_VIEW_TYPE, summaryView, 1);
    }

    private async onProductDescriptionChanged(event: {
        tenantId: string;
        productId: string;
        description: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.productId);

        const detailResult = await this.documentStore.read<ProductDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = { ...detailResult.state, description: event.description };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<ProductSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = { ...summaryResult.state, description: event.description };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onProductOwnerChanged(event: {
        tenantId: string;
        productId: string;
        productOwnerId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.productId);

        const result = await this.documentStore.read<ProductDetailView>(id, DETAIL_VIEW_TYPE);
        if (result.state) {
            const updated = { ...result.state, productOwnerId: event.productOwnerId };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onProductDiscussionRequested(event: {
        tenantId: string;
        productId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.productId);

        const result = await this.documentStore.read<ProductDetailView>(id, DETAIL_VIEW_TYPE);
        if (result.state) {
            const updated = { ...result.state, discussionRequested: true };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onProductDiscussionAttached(event: {
        tenantId: string;
        productId: string;
        discussionId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.productId);

        const result = await this.documentStore.read<ProductDetailView>(id, DETAIL_VIEW_TYPE);
        if (result.state) {
            const updated = { ...result.state, discussionId: event.discussionId };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, result.stateVersion + 1);
        }
    }

}
