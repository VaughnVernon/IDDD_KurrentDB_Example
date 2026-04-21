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

import { Tenant } from '../domain/model/agilepm/tenant/Tenant';
import { ProductId } from '../domain/model/agilepm/product/ProductId';
import { SprintId } from '../domain/model/agilepm/sprint/SprintId';
import { BacklogItemId } from '../domain/model/agilepm/backlogitem/BacklogItemId';
import { Sprint } from '../domain/model/agilepm/sprint/Sprint';

/**
 * Application service for Sprint commands.
 * Handles sprint-related use cases by coordinating domain operations.
 *
 * Note: Sprint planning is done through ProductCommands.planSprint(),
 * as the Ubiquitous Language expresses that a Product plans a Sprint.
 */
export class SprintCommands {
    /**
     * Commit a backlog item to an existing sprint.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param sprintId - The sprint identifier
     * @param backlogItemId - The backlog item identifier to commit
     */
    async commitBacklogItem(
        tenantId: string,
        productId: string,
        sprintId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const sprint = Sprint.of(
            tenant,
            ProductId.of(productId),
            SprintId.of(sprintId)
        );

        await sprint.commit(BacklogItemId.of(backlogItemId));
    }

    /**
     * Uncommit a backlog item from an existing sprint.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param sprintId - The sprint identifier
     * @param backlogItemId - The backlog item identifier to uncommit
     */
    async uncommitBacklogItem(
        tenantId: string,
        productId: string,
        sprintId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const sprint = Sprint.of(
            tenant,
            ProductId.of(productId),
            SprintId.of(sprintId)
        );

        await sprint.uncommit(BacklogItemId.of(backlogItemId));
    }
}
