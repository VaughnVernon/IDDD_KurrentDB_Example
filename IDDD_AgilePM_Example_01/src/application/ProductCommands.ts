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
import { ProductOwnerId } from '../domain/model/agilepm/team/ProductOwnerId';
import { SprintId } from '../domain/model/agilepm/sprint/SprintId';
import { ReleaseId } from '../domain/model/agilepm/release/ReleaseId';
import { Product } from '../domain/model/agilepm/product/Product';

/**
 * Application service for Product commands.
 * Handles all product-related use cases by coordinating domain operations.
 */
export class ProductCommands {
    /**
     * Initiate a new product.
     * Generates a new ProductId.
     *
     * @param tenantId - The tenant identifier
     * @param name - The product name
     * @param description - The product description
     * @param username - The product owner's username from Identity and Access context
     * @returns The generated product ID
     */
    async initiateProduct(
        tenantId: string,
        name: string,
        description: string,
        username: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const productId = ProductId.unique();
        const ownerId = ProductOwnerId.of(tenantId, username);

        await Product.initiate(tenant, productId, name, description, ownerId);

        return productId.id;
    }

    /**
     * Change the description of an existing product.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param description - The new description
     */
    async changeDescription(
        tenantId: string,
        productId: string,
        description: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const product = Product.of(tenant, ProductId.of(productId));

        await product.changeDescription(description);
    }

    /**
     * Change the product owner of an existing product.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param username - The new product owner's username from Identity and Access context
     */
    async changeProductOwner(
        tenantId: string,
        productId: string,
        username: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const ownerId = ProductOwnerId.of(tenantId, username);
        const product = Product.of(tenant, ProductId.of(productId));

        await product.changeProductOwner(ownerId);
    }

    /**
     * Request a discussion for an existing product.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     */
    async requestDiscussion(
        tenantId: string,
        productId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const product = Product.of(tenant, ProductId.of(productId));

        await product.requestDiscussion();
    }

    /**
     * Initiate a discussion for an existing product.
     * Called when the collaboration context responds with a discussionId.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param discussionId - The discussion identifier from collaboration context
     */
    async attachDiscussion(
        tenantId: string,
        productId: string,
        discussionId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const product = Product.of(tenant, ProductId.of(productId));

        await product.attachDiscussion(discussionId);
    }

    /**
     * Handle discussion request timeout for an existing product.
     * Called when the collaboration context doesn't respond in time.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     */
    async timeOutDiscussionRequest(
        tenantId: string,
        productId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const product = Product.of(tenant, ProductId.of(productId));

        await product.timeOutDiscussionRequest();
    }

    /**
     * Plan a new sprint for an existing product.
     * Generates a new SprintId.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param name - The sprint name
     * @param goals - The sprint goals
     * @param begins - The sprint start date
     * @param ends - The sprint end date
     * @returns The generated sprint ID
     */
    async planSprint(
        tenantId: string,
        productId: string,
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const sprintId = SprintId.generate();
        const product = Product.of(tenant, ProductId.of(productId));

        await product.planSprint(sprintId, name, goals, begins, ends);

        return sprintId.id;
    }

    /**
     * Schedule a new release for an existing product.
     * Generates a new ReleaseId.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param name - The release name
     * @param description - The release description
     * @param begins - The release start date
     * @param ends - The release end date
     * @returns The generated release ID
     */
    async scheduleRelease(
        tenantId: string,
        productId: string,
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const releaseId = ReleaseId.generate();
        const product = Product.of(tenant, ProductId.of(productId));

        await product.scheduleRelease(releaseId, name, description, begins, ends);

        return releaseId.id;
    }
}
