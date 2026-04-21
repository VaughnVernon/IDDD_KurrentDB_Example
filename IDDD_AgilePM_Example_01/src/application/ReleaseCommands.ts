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
import { ReleaseId } from '../domain/model/agilepm/release/ReleaseId';
import { BacklogItemId } from '../domain/model/agilepm/backlogitem/BacklogItemId';
import { Release } from '../domain/model/agilepm/release/Release';

/**
 * Application service for Release commands.
 * Handles release-related use cases by coordinating domain operations.
 *
 * Note: Release scheduling is done through ProductCommands.scheduleRelease(),
 * as the Ubiquitous Language expresses that a Product schedules a Release.
 */
export class ReleaseCommands {
    /**
     * Archive an existing release.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param releaseId - The release identifier
     */
    async archiveRelease(
        tenantId: string,
        productId: string,
        releaseId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const release = Release.of(
            tenant,
            ProductId.of(productId),
            ReleaseId.of(releaseId)
        );

        await release.archive();
    }

    /**
     * Schedule a backlog item for an existing release.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param releaseId - The release identifier
     * @param backlogItemId - The backlog item identifier to schedule
     */
    async scheduleBacklogItem(
        tenantId: string,
        productId: string,
        releaseId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const release = Release.of(
            tenant,
            ProductId.of(productId),
            ReleaseId.of(releaseId)
        );

        await release.scheduleBacklogItem(BacklogItemId.of(backlogItemId));
    }

    /**
     * Unschedule a backlog item from an existing release.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param releaseId - The release identifier
     * @param backlogItemId - The backlog item identifier to unschedule
     */
    async unscheduleBacklogItem(
        tenantId: string,
        productId: string,
        releaseId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const release = Release.of(
            tenant,
            ProductId.of(productId),
            ReleaseId.of(releaseId)
        );

        await release.unscheduleBacklogItem(BacklogItemId.of(backlogItemId));
    }
}
