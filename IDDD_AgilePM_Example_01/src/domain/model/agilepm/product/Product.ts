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

import { stage, type Protocol, type Definition, type ActorProtocol } from 'domo-actors';
import { EventSourcedEntity } from 'domo-tactical';
import { Tenant } from '../tenant/Tenant';
import { ProductId } from './ProductId';
import { ProductOwnerId } from '../team/ProductOwnerId';
import { SprintId } from '../sprint/SprintId';
import { ReleaseId } from '../release/ReleaseId';
import { Sprint } from '../sprint/Sprint';
import { Release } from '../release/Release';
import {
    ProductInitiated,
    ProductDescriptionChanged,
    ProductOwnerChanged,
    ProductDiscussionRequested,
    ProductDiscussionAttached,
    ProductDiscussionRequestTimedOut
} from './events';

/**
 * Protocol for Product aggregate operations.
 *
 * A Product represents a software product or project being managed using
 * Scrum. It is the parent of backlog items, sprints, and releases.
 *
 * This is a command-only interface following CQRS principles. Queries
 * are performed via the read model maintained by projections.
 */
export interface Product extends ActorProtocol {
    /**
     * Initiate a new product, which is the initial command message sent by the initiateProduct() function.
     *
     * @param name - The name of the product
     * @param description - The description of the product
     * @param productOwnerId - The product owner identity
     */
    initiate(name: string, description: string, productOwnerId: ProductOwnerId): Promise<void>;

    /**
     * Change the product description.
     *
     * @param description - The description of the product
     */
    changeDescription(description: string): Promise<void>;

    /**
     * Change the product owner.
     *
     * @param productOwnerId - The new product owner identity
     */
    changeProductOwner(productOwnerId: ProductOwnerId): Promise<void>;

    /**
     * Request a discussion for this product.
     */
    requestDiscussion(): Promise<void>;

    /**
     * Attach a discussion to this product.
     * Called by the saga when collaboration context responds with discussionId.
     */
    attachDiscussion(discussionId: string): Promise<void>;

    /**
     * Handle a discussion request timeout.
     * Called by the saga when the collaboration context doesn't respond in time.
     */
    timeOutDiscussionRequest(): Promise<void>;

    /**
     * Plan a new sprint for this product.
     */
    planSprint(
        sprintId: SprintId,
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<void>;

    /**
     * Schedule a new release for this product.
     */
    scheduleRelease(
        releaseId: ReleaseId,
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<void>;
}

/**
 * Namespace for Product factory functions.
 */
export namespace Product {
    /**
     * Generate stream name for a Product.
     */
    export function streamNameFor(tenant: Tenant, productId: ProductId): string {
        return `Product-${tenant.id}-${productId.id}`;
    }

    /**
     * Initiates a new Product as an actor.
     *
     * @param tenant - The tenant this product belongs to
     * @param productId - The unique product identifier
     * @param name - The name of the product
     * @param description - The description of the product
     * @param productOwnerId - The product owner identity
     * @returns A Product actor ready to be defined or hydrated
     */
    export async function initiate(
        tenant: Tenant,
        productId: ProductId,
        name: string,
        description: string,
        productOwnerId: ProductOwnerId
    ): Promise<Product> {
        const product = stage().actorFor<Product>(
            productProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId
        );

        await product.initiate(name, description, productOwnerId);

        return product;
    }

    /**
     * Get an existing Product actor by its identifiers.
     * The actor will rehydrate from the journal when commands are sent to it.
     *
     * @param tenant - The tenant this product belongs to
     * @param productId - The unique product identifier
     * @returns A Product actor reference
     */
    export function of(
        tenant: Tenant,
        productId: ProductId
    ): Product {
        return stage().actorFor<Product>(
            productProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId
        );
    }
}


/**
 * Protocol for creating ProductActor instances.
 */
const productProtocol: Protocol = {
    type: () => 'Product',
    instantiator: () => ({
        instantiate: (def: Definition) => {
            const [tenant, productId] = def.parameters();
            return new ProductActor(tenant as Tenant, productId as ProductId);
        }
    })
};

/**
 * Event-sourced Product actor implementation.
 */
class ProductActor extends EventSourcedEntity implements Product {
    private _tenant!: Tenant;
    private _productId!: ProductId;
    private _name!: string;
    private _description!: string;
    private _productOwnerId!: ProductOwnerId;
    private _discussionId?: string;
    private _discussionRequested: boolean = false;

    /**
     * Register event consumers for state reconstruction.
     */
    static {
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductInitiated,
            (product, event) => product.whenProductInitiated(event)
        );
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductDescriptionChanged,
            (product, event) => product.whenProductDescriptionChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductOwnerChanged,
            (product, event) => product.whenProductOwnerChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductDiscussionRequested,
            (product, event) => product.whenProductDiscussionRequested(event)
        );
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductDiscussionAttached,
            (product, event) => product.whenProductDiscussionAttached(event)
        );
        EventSourcedEntity.registerConsumer(
            ProductActor, ProductDiscussionRequestTimedOut,
            (product, event) => product.whenProductDiscussionRequestTimedOut(event)
        );
    }

    constructor(tenant: Tenant, productId: ProductId) {
        super(Product.streamNameFor(tenant, productId))

        this._tenant = tenant;
        this._productId = productId;
    }

    // Command methods

    async initiate(
        name: string,
        description: string,
        productOwnerId: ProductOwnerId
    ): Promise<void> {
        if (this._name) {
            return
        }

        if (!name?.trim()) {
            throw new Error('Product name cannot be empty')
        }
        if (!description?.trim()) {
            throw new Error('Product description cannot be empty')
        }

        await this.apply(ProductInitiated.with(
            this._tenant,
            this._productId,
            name.trim(),
            description?.trim(),
            productOwnerId
        ))
    }

    async changeDescription(description: string): Promise<void> {
        const maybeDescription = description?.trim() ?? ''
        if (!maybeDescription || this._description === maybeDescription) {
            return
        }

        await this.apply(ProductDescriptionChanged.with(
            this._tenant,
            this._productId,
            description.trim() ?? ''
        ))
    }

    async changeProductOwner(productOwnerId: ProductOwnerId): Promise<void> {
        if (this._productOwnerId?.equals(productOwnerId)) {
            return;
        }

        await this.apply(ProductOwnerChanged.with(
            this._tenant,
            this._productId,
            productOwnerId
        ));
    }

    async requestDiscussion(): Promise<void> {
        if (this._discussionRequested) {
            throw new Error('Discussion already requested');
        }
        if (this._discussionId) {
            throw new Error('Discussion already attached');
        }

        await this.apply(ProductDiscussionRequested.with(
            this._tenant,
            this._productId
        ));
    }

    async attachDiscussion(discussionId: string): Promise<void> {
        if (!discussionId?.trim()) {
            throw new Error('Discussion ID cannot be empty');
        }
        if (this._discussionId) {
            return; // Already initiated
        }

        await this.apply(ProductDiscussionAttached.with(
            this._tenant,
            this._productId,
            discussionId.trim()
        ));
    }

    async timeOutDiscussionRequest(): Promise<void> {
        if (!this._discussionRequested) {
            return; // No request to time out
        }
        if (this._discussionId) {
            return; // Discussion already received
        }

        await this.apply(ProductDiscussionRequestTimedOut.with(
            this._tenant,
            this._productId,
            new Date()
        ));
    }

    async planSprint(
        sprintId: SprintId,
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<void> {
        await Sprint.plan(
            this._tenant,
            this._productId,
            sprintId,
            name,
            goals,
            begins,
            ends
        );
    }

    async scheduleRelease(
        releaseId: ReleaseId,
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<void> {
        await Release.schedule(
            this._tenant,
            this._productId,
            releaseId,
            name,
            description,
            begins,
            ends
        );
    }

    // Event handlers (state mutators)

    private whenProductInitiated(event: ProductInitiated): void {
        this._tenant = Tenant.of(event.tenantId);
        this._productId = ProductId.of(event.productId);
        this._name = event.name;
        this._description = event.description;
        this._productOwnerId = ProductOwnerId.from(event.productOwnerId);
    }

    private whenProductDescriptionChanged(event: ProductDescriptionChanged): void {
        this._description = event.description;
    }

    private whenProductOwnerChanged(event: ProductOwnerChanged): void {
        this._productOwnerId = ProductOwnerId.from(event.productOwnerId);
    }

    private whenProductDiscussionRequested(_event: ProductDiscussionRequested): void {
        this._discussionRequested = true;
    }

    private whenProductDiscussionAttached(event: ProductDiscussionAttached): void {
        this._discussionId = event.discussionId;
        this._discussionRequested = false;
    }

    private whenProductDiscussionRequestTimedOut(_event: ProductDiscussionRequestTimedOut): void {
        this._discussionRequested = false;
    }
}
