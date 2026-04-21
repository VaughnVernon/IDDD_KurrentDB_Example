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
import { ProductId } from '../product/ProductId';
import { ReleaseId } from './ReleaseId';
import { BacklogItemId } from '../backlogitem/BacklogItemId';
import { ScheduledBacklogItem } from './ScheduledBacklogItem';
import {
    ReleaseScheduled,
    ReleaseArchived,
    ReleaseBacklogItemScheduled,
    ReleaseBacklogItemUnscheduled
} from './events';

/**
 * Protocol for Release aggregate operations.
 *
 * A Release represents a planned deployment of a set of backlog items
 * to production, typically spanning multiple sprints.
 *
 * This is a command-only interface following CQRS principles.
 * Queries should be performed via read models/projections.
 */
export interface Release extends ActorProtocol {
    /**
     * Schedule a new release (initial creation command).
     */
    plan(
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<void>;

    /**
     * Archive this release.
     */
    archive(): Promise<void>;

    /**
     * Schedule a backlog item for this release.
     */
    scheduleBacklogItem(backlogItemId: BacklogItemId): Promise<void>;

    /**
     * Unschedule a backlog item from this release.
     */
    unscheduleBacklogItem(backlogItemId: BacklogItemId): Promise<void>;
}

/**
 * Namespace for Release factory functions.
 */
export namespace Release {
    /**
     * Generate stream name for a Release.
     */
    export function streamNameFor(tenant: Tenant, releaseId: ReleaseId): string {
        return `Release-${tenant.id}-${releaseId.id}`;
    }

    /**
     * Schedule a new Release as an actor.
     *
     * @param tenant - The tenant this release belongs to
     * @param productId - The product this release belongs to
     * @param releaseId - The unique release identifier
     * @param name - The name of the release
     * @param description - The description of the release
     * @param begins - The release start date
     * @param ends - The release end date
     * @returns A Release actor that has been scheduled
     */
    export async function schedule(
        tenant: Tenant,
        productId: ProductId,
        releaseId: ReleaseId,
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<Release> {
        const release = stage().actorFor<Release>(
            releaseProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            releaseId
        );

        await release.plan(name, description, begins, ends);

        return release;
    }

    /**
     * Get an existing Release actor by its identifiers.
     *
     * @param tenant - The tenant this release belongs to
     * @param productId - The product this release belongs to
     * @param releaseId - The unique release identifier
     * @returns A Release actor reference
     */
    export function of(
        tenant: Tenant,
        productId: ProductId,
        releaseId: ReleaseId
    ): Release {
        return stage().actorFor<Release>(
            releaseProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            releaseId
        );
    }
}


/**
 * Protocol for creating ReleaseActor instances.
 */
const releaseProtocol: Protocol = {
    type: () => 'Release',
    instantiator: () => ({
        instantiate: (def: Definition) => {
            const [tenant, productId, releaseId] = def.parameters();
            return new ReleaseActor(
                tenant as Tenant,
                productId as ProductId,
                releaseId as ReleaseId
            );
        }
    })
};

/**
 * Event-sourced Release actor implementation.
 */
class ReleaseActor extends EventSourcedEntity implements Release {
    private _tenant!: Tenant;
    private _productId!: ProductId;
    private _releaseId!: ReleaseId;
    private _name!: string;
    private _description!: string;
    private _begins!: Date;
    private _ends!: Date;
    private _archived: boolean = false;
    private _scheduledBacklogItems: Map<string, ScheduledBacklogItem> = new Map();

    /**
     * Register event consumers for state reconstruction.
     */
    static {
        EventSourcedEntity.registerConsumer(
            ReleaseActor, ReleaseScheduled,
            (release, event) => release.whenReleaseScheduled(event)
        );
        EventSourcedEntity.registerConsumer(
            ReleaseActor, ReleaseArchived,
            (release, event) => release.whenReleaseArchived(event)
        );
        EventSourcedEntity.registerConsumer(
            ReleaseActor, ReleaseBacklogItemScheduled,
            (release, event) => release.whenReleaseBacklogItemScheduled(event)
        );
        EventSourcedEntity.registerConsumer(
            ReleaseActor, ReleaseBacklogItemUnscheduled,
            (release, event) => release.whenReleaseBacklogItemUnscheduled(event)
        );
    }

    constructor(tenant: Tenant, productId: ProductId, releaseId: ReleaseId) {
        super(Release.streamNameFor(tenant, releaseId));
        this._tenant = tenant;
        this._productId = productId;
        this._releaseId = releaseId;
    }

    // Command methods

    async plan(
        name: string,
        description: string,
        begins: Date,
        ends: Date
    ): Promise<void> {
        if (this._name) {
            return;
        }

        if (!name?.trim()) {
            throw new Error('Release name cannot be empty');
        }
        if (begins >= ends) {
            throw new Error('Release begin date must be before end date');
        }

        await this.apply(ReleaseScheduled.with(
            this._tenant,
            this._productId,
            this._releaseId,
            name.trim(),
            description?.trim() ?? '',
            begins,
            ends
        ));
    }

    async archive(): Promise<void> {
        if (this._archived) {
            throw new Error('Release is already archived');
        }

        await this.apply(ReleaseArchived.with(
            this._tenant,
            this._productId,
            this._releaseId
        ));
    }

    async scheduleBacklogItem(backlogItemId: BacklogItemId): Promise<void> {
        if (this._archived) {
            throw new Error('Cannot schedule items for an archived release');
        }
        if (this._scheduledBacklogItems.has(backlogItemId.id)) {
            throw new Error('Backlog item already scheduled for this release');
        }

        const ordering = this._scheduledBacklogItems.size;

        await this.apply(ReleaseBacklogItemScheduled.with(
            this._tenant,
            this._productId,
            this._releaseId,
            backlogItemId,
            ordering
        ));
    }

    async unscheduleBacklogItem(backlogItemId: BacklogItemId): Promise<void> {
        if (this._archived) {
            throw new Error('Cannot unschedule items from an archived release');
        }
        if (!this._scheduledBacklogItems.has(backlogItemId.id)) {
            throw new Error('Backlog item not scheduled for this release');
        }

        await this.apply(ReleaseBacklogItemUnscheduled.with(
            this._tenant,
            this._productId,
            this._releaseId,
            backlogItemId
        ));
    }

    // Event handlers (state mutators)

    private whenReleaseScheduled(event: ReleaseScheduled): void {
        this._tenant = Tenant.of(event.tenantId);
        this._productId = ProductId.of(event.productId);
        this._releaseId = ReleaseId.of(event.releaseId);
        this._name = event.name;
        this._description = event.description;
        this._begins = event.begins;
        this._ends = event.ends;
    }

    private whenReleaseArchived(_event: ReleaseArchived): void {
        this._archived = true;
    }

    private whenReleaseBacklogItemScheduled(event: ReleaseBacklogItemScheduled): void {
        const scheduled = new ScheduledBacklogItem(
            BacklogItemId.of(event.backlogItemId),
            event.ordering
        );
        this._scheduledBacklogItems.set(event.backlogItemId, scheduled);
    }

    private whenReleaseBacklogItemUnscheduled(event: ReleaseBacklogItemUnscheduled): void {
        this._scheduledBacklogItems.delete(event.backlogItemId);
    }
}
