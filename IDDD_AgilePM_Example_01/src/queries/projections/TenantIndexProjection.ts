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
import { type TenantProductIndexView, type TenantTeamIndexView } from '../views/TenantIndexView';
import { type ProductSummaryView } from '../views/ProductSummaryView';
import { type TeamSummaryView } from '../views/TeamSummaryView';

const PRODUCT_INDEX_TYPE = 'TenantProductIndexView';
const TEAM_INDEX_TYPE = 'TenantTeamIndexView';

/**
 * Projection that maintains tenant-level index views with summaries for Products and Teams.
 */
export class TenantIndexProjection extends Actor implements Projection {
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
                    case 'TeamCreated':
                        await this.onTeamCreated(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private async onProductInitiated(event: {
        tenantId: string;
        productId: string;
        name: string;
        description: string;
    }): Promise<void> {
        const id = event.tenantId;
        const summary: ProductSummaryView = {
            tenantId: event.tenantId,
            productId: event.productId,
            name: event.name,
            description: event.description
        };

        const result = await this.documentStore.read<TenantProductIndexView>(id, PRODUCT_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                products: [...result.state.products, summary]
            };
            await this.documentStore.write(id, PRODUCT_INDEX_TYPE, updated, result.stateVersion + 1);
        } else {
            const indexView: TenantProductIndexView = {
                tenantId: event.tenantId,
                products: [summary]
            };
            await this.documentStore.write(id, PRODUCT_INDEX_TYPE, indexView, 1);
        }
    }

    private async onProductDescriptionChanged(event: {
        tenantId: string;
        productId: string;
        description: string;
    }): Promise<void> {
        const id = event.tenantId;
        const result = await this.documentStore.read<TenantProductIndexView>(id, PRODUCT_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                products: result.state.products.map(p =>
                    p.productId === event.productId
                        ? { ...p, description: event.description }
                        : p
                )
            };
            await this.documentStore.write(id, PRODUCT_INDEX_TYPE, updated, result.stateVersion + 1);
        }
    }

    private async onTeamCreated(event: {
        tenantId: string;
        teamId: string;
        name: string;
    }): Promise<void> {
        const id = event.tenantId;
        const summary: TeamSummaryView = {
            tenantId: event.tenantId,
            teamId: event.teamId,
            name: event.name,
            memberCount: 0
        };

        const result = await this.documentStore.read<TenantTeamIndexView>(id, TEAM_INDEX_TYPE);

        if (result.state) {
            const updated = {
                ...result.state,
                teams: [...result.state.teams, summary]
            };
            await this.documentStore.write(id, TEAM_INDEX_TYPE, updated, result.stateVersion + 1);
        } else {
            const indexView: TenantTeamIndexView = {
                tenantId: event.tenantId,
                teams: [summary]
            };
            await this.documentStore.write(id, TEAM_INDEX_TYPE, indexView, 1);
        }
    }
}
