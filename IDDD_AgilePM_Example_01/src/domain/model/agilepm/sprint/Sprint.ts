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
import { SprintId } from './SprintId';
import { BacklogItemId } from '../backlogitem/BacklogItemId';
import { CommittedBacklogItem } from './CommittedBacklogItem';
import {
    SprintPlanned,
    SprintBacklogItemCommitted,
    SprintBacklogItemUncommitted,
    SprintRetrospectiveRecorded
} from './events';

/**
 * Protocol for Sprint aggregate operations.
 *
 * A Sprint represents a time-boxed iteration during which a team works
 * on a set of committed backlog items.
 *
 * This is a command-only interface following CQRS principles.
 * Queries should be performed via read models/projections.
 */
export interface Sprint extends ActorProtocol {
    /**
     * Plan a new sprint (initial creation command).
     */
    plan(
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<void>;

    /**
     * Commit a backlog item to this sprint.
     */
    commit(backlogItemId: BacklogItemId): Promise<void>;

    /**
     * Uncommit a backlog item from this sprint.
     */
    uncommit(backlogItemId: BacklogItemId): Promise<void>;

    /**
     * Record the retrospective results for this sprint.
     */
    recordRetrospective(results: string): Promise<void>;
}

/**
 * Namespace for Sprint factory functions.
 */
export namespace Sprint {
    /**
     * Generate stream name for a Sprint.
     */
    export function streamNameFor(tenant: Tenant, sprintId: SprintId): string {
        return `Sprint-${tenant.id}-${sprintId.id}`;
    }

    /**
     * Plan a new Sprint as an actor.
     *
     * @param tenant - The tenant this sprint belongs to
     * @param productId - The product this sprint belongs to
     * @param sprintId - The unique sprint identifier
     * @param name - The name of the sprint
     * @param goals - The goals for the sprint
     * @param begins - The sprint start date
     * @param ends - The sprint end date
     * @returns A Sprint actor that has been planned
     */
    export async function plan(
        tenant: Tenant,
        productId: ProductId,
        sprintId: SprintId,
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<Sprint> {
        const sprint = stage().actorFor<Sprint>(
            sprintProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            sprintId
        );

        await sprint.plan(name, goals, begins, ends);

        return sprint;
    }

    /**
     * Get an existing Sprint actor by its identifiers.
     *
     * @param tenant - The tenant this sprint belongs to
     * @param productId - The product this sprint belongs to
     * @param sprintId - The unique sprint identifier
     * @returns A Sprint actor reference
     */
    export function of(
        tenant: Tenant,
        productId: ProductId,
        sprintId: SprintId
    ): Sprint {
        return stage().actorFor<Sprint>(
            sprintProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            sprintId
        );
    }
}


/**
 * Protocol for creating SprintActor instances.
 */
const sprintProtocol: Protocol = {
    type: () => 'Sprint',
    instantiator: () => ({
        instantiate: (def: Definition) => {
            const [tenant, productId, sprintId] = def.parameters();
            return new SprintActor(
                tenant as Tenant,
                productId as ProductId,
                sprintId as SprintId
            );
        }
    })
};

/**
 * Event-sourced Sprint actor implementation.
 */
class SprintActor extends EventSourcedEntity implements Sprint {
    private _tenant!: Tenant;
    private _productId!: ProductId;
    private _sprintId!: SprintId;
    private _name!: string;
    private _goals!: string;
    private _begins!: Date;
    private _ends!: Date;
    private _retrospective!: string;
    private _committedBacklogItems: Map<string, CommittedBacklogItem> = new Map();

    /**
     * Register event consumers for state reconstruction.
     */
    static {
        EventSourcedEntity.registerConsumer(
            SprintActor, SprintPlanned,
            (sprint, event) => sprint.whenSprintPlanned(event)
        );
        EventSourcedEntity.registerConsumer(
            SprintActor, SprintBacklogItemCommitted,
            (sprint, event) => sprint.whenSprintBacklogItemCommitted(event)
        );
        EventSourcedEntity.registerConsumer(
            SprintActor, SprintBacklogItemUncommitted,
            (sprint, event) => sprint.whenSprintBacklogItemUncommitted(event)
        );
        EventSourcedEntity.registerConsumer(
            SprintActor, SprintRetrospectiveRecorded,
            (sprint, event) => sprint.whenSprintRetrospectiveRecorded(event)
        );
    }

    constructor(tenant: Tenant, productId: ProductId, sprintId: SprintId) {
        super(Sprint.streamNameFor(tenant, sprintId));
        this._tenant = tenant;
        this._productId = productId;
        this._sprintId = sprintId;
    }

    // Command methods

    async plan(
        name: string,
        goals: string,
        begins: Date,
        ends: Date
    ): Promise<void> {
        if (this._name) {
            return;
        }

        if (!name?.trim()) {
            throw new Error('Sprint name cannot be empty');
        }
        if (begins >= ends) {
            throw new Error('Sprint begin date must be before end date');
        }

        await this.apply(SprintPlanned.with(
            this._tenant,
            this._productId,
            this._sprintId,
            name.trim(),
            goals?.trim() ?? '',
            begins,
            ends
        ));
    }

    async commit(backlogItemId: BacklogItemId): Promise<void> {
        if (this._committedBacklogItems.has(backlogItemId.id)) {
            throw new Error('Backlog item already committed to this sprint');
        }

        const ordering = this._committedBacklogItems.size;

        await this.apply(SprintBacklogItemCommitted.with(
            this._tenant,
            this._productId,
            this._sprintId,
            backlogItemId,
            ordering
        ));
    }

    async uncommit(backlogItemId: BacklogItemId): Promise<void> {
        if (!this._committedBacklogItems.has(backlogItemId.id)) {
            throw new Error('Backlog item not committed to this sprint');
        }

        await this.apply(SprintBacklogItemUncommitted.with(
            this._tenant,
            this._productId,
            this._sprintId,
            backlogItemId
        ));
    }

    async recordRetrospective(results: string): Promise<void> {
        if (!results?.trim()) {
            throw new Error('Retrospective results cannot be empty');
        }

        await this.apply(SprintRetrospectiveRecorded.with(
            this._tenant,
            this._productId,
            this._sprintId,
            results.trim()
        ));
    }

    // Event handlers (state mutators)

    private whenSprintPlanned(event: SprintPlanned): void {
        this._tenant = Tenant.of(event.tenantId);
        this._productId = ProductId.of(event.productId);
        this._sprintId = SprintId.of(event.sprintId);
        this._name = event.name;
        this._goals = event.goals;
        this._begins = event.begins;
        this._ends = event.ends;
    }

    private whenSprintBacklogItemCommitted(event: SprintBacklogItemCommitted): void {
        const committed = new CommittedBacklogItem(
            BacklogItemId.of(event.backlogItemId),
            event.ordering
        );
        this._committedBacklogItems.set(event.backlogItemId, committed);
    }

    private whenSprintBacklogItemUncommitted(event: SprintBacklogItemUncommitted): void {
        this._committedBacklogItems.delete(event.backlogItemId);
    }

    private whenSprintRetrospectiveRecorded(event: SprintRetrospectiveRecorded): void {
        this._retrospective = event.retrospective;
    }
}
