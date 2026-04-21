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

/**
 * Event adapter registration for the AgilePM bounded context.
 *
 * This module registers entry adapters for all domain events so that
 * they can be properly serialized/deserialized by the Journal.
 *
 * Import this module early in your application startup to ensure
 * events are correctly reconstructed when reading from the journal.
 */
import { type Source } from 'domo-tactical';
import { EntryAdapterProvider, DefaultTextEntryAdapter } from 'domo-tactical/store';

// Product events
import { ProductInitiated } from '../../domain/model/agilepm/product/events/ProductInitiated';
import { ProductDescriptionChanged } from '../../domain/model/agilepm/product/events/ProductDescriptionChanged';
import { ProductOwnerChanged } from '../../domain/model/agilepm/product/events/ProductOwnerChanged';
import { ProductDiscussionRequested } from '../../domain/model/agilepm/product/events/ProductDiscussionRequested';

// Team events
import { TeamCreated } from '../../domain/model/agilepm/team/events/TeamCreated';
import { TeamMemberRegistered } from '../../domain/model/agilepm/team/events/TeamMemberRegistered';
import { TeamMemberEmailAddressChanged } from '../../domain/model/agilepm/team/events/TeamMemberEmailAddressChanged';
import { TeamMemberNameChanged } from '../../domain/model/agilepm/team/events/TeamMemberNameChanged';
import { TeamMemberEnabled } from '../../domain/model/agilepm/team/events/TeamMemberEnabled';
import { TeamMemberDisabled } from '../../domain/model/agilepm/team/events/TeamMemberDisabled';
import { TeamMemberRemoved } from '../../domain/model/agilepm/team/events/TeamMemberRemoved';
import { TeamProductOwnerAssigned } from '../../domain/model/agilepm/team/events/TeamProductOwnerAssigned';

// Sprint events
import { SprintPlanned } from '../../domain/model/agilepm/sprint/events/SprintPlanned';
import { SprintBacklogItemCommitted } from '../../domain/model/agilepm/sprint/events/SprintBacklogItemCommitted';
import { SprintBacklogItemUncommitted } from '../../domain/model/agilepm/sprint/events/SprintBacklogItemUncommitted';
import { SprintRetrospectiveRecorded } from '../../domain/model/agilepm/sprint/events/SprintRetrospectiveRecorded';

// Release events
import { ReleaseScheduled } from '../../domain/model/agilepm/release/events/ReleaseScheduled';
import { ReleaseArchived } from '../../domain/model/agilepm/release/events/ReleaseArchived';
import { ReleaseBacklogItemScheduled } from '../../domain/model/agilepm/release/events/ReleaseBacklogItemScheduled';
import { ReleaseBacklogItemUnscheduled } from '../../domain/model/agilepm/release/events/ReleaseBacklogItemUnscheduled';

// BacklogItem events
import { BacklogItemPlanned } from '../../domain/model/agilepm/backlogitem/events/BacklogItemPlanned';
import { BacklogItemCommitted } from '../../domain/model/agilepm/backlogitem/events/BacklogItemCommitted';
import { BacklogItemUncommitted } from '../../domain/model/agilepm/backlogitem/events/BacklogItemUncommitted';
import { BacklogItemScheduled } from '../../domain/model/agilepm/backlogitem/events/BacklogItemScheduled';
import { BacklogItemUnscheduled } from '../../domain/model/agilepm/backlogitem/events/BacklogItemUnscheduled';
import { BacklogItemStoryPointsAssigned } from '../../domain/model/agilepm/backlogitem/events/BacklogItemStoryPointsAssigned';
import { BacklogItemTypeChanged } from '../../domain/model/agilepm/backlogitem/events/BacklogItemTypeChanged';
import { BacklogItemSummarized } from '../../domain/model/agilepm/backlogitem/events/BacklogItemSummarized';
import { BacklogItemStoryTold } from '../../domain/model/agilepm/backlogitem/events/BacklogItemStoryTold';
import { BacklogItemMarkedAsRemoved } from '../../domain/model/agilepm/backlogitem/events/BacklogItemMarkedAsRemoved';
import { BacklogItemDiscussionRequested } from '../../domain/model/agilepm/backlogitem/events/BacklogItemDiscussionRequested';
import { BacklogItemDiscussionAttached } from '../../domain/model/agilepm/backlogitem/events/BacklogItemDiscussionAttached';
import { BacklogItemBusinessPriorityAssigned } from '../../domain/model/agilepm/backlogitem/events/BacklogItemBusinessPriorityAssigned';
import { BacklogItemStatusChanged } from '../../domain/model/agilepm/backlogitem/events/BacklogItemStatusChanged';
import { TaskDefined } from '../../domain/model/agilepm/backlogitem/events/TaskDefined';
import { TaskDescribed } from '../../domain/model/agilepm/backlogitem/events/TaskDescribed';
import { TaskHoursEstimated } from '../../domain/model/agilepm/backlogitem/events/TaskHoursEstimated';
import { TaskStatusChanged } from '../../domain/model/agilepm/backlogitem/events/TaskStatusChanged';
import { TaskVolunteerAssigned } from '../../domain/model/agilepm/backlogitem/events/TaskVolunteerAssigned';
import { TaskRemoved } from '../../domain/model/agilepm/backlogitem/events/TaskRemoved';
import { TaskRenamed } from '../../domain/model/agilepm/backlogitem/events/TaskRenamed';

// Product discussion saga events
import { ProductDiscussionAttached } from '../../domain/model/agilepm/product/events/ProductDiscussionAttached';
import { ProductDiscussionRequestTimedOut } from '../../domain/model/agilepm/product/events/ProductDiscussionRequestTimedOut';

/**
 * Factory function type for creating event instances from deserialized data.
 */
type EventFactory<T extends Source<unknown>> = (data: Record<string, unknown>) => T;

/**
 * Creates a text entry adapter for a domain event type.
 * The factory function should construct the event from its deserialized properties.
 */
class TypedTextEntryAdapter<T extends Source<unknown>> extends DefaultTextEntryAdapter<T> {
    constructor(private readonly factory: EventFactory<T>) {
        super();
    }

    protected override upcastIfNeeded(data: unknown, _type: string, _version: number): T {
        return this.factory(data as Record<string, unknown>);
    }
}

/**
 * Helper to create and register an adapter for an event type.
 */
function registerEventAdapter<T extends Source<unknown>>(
    provider: EntryAdapterProvider,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventClass: new (...args: any[]) => T,
    factory: EventFactory<T>
): void {
    provider.registerAdapter(eventClass, new TypedTextEntryAdapter<T>(factory));
}

/**
 * Register all AgilePM domain event adapters with the EntryAdapterProvider.
 * Call this function during application initialization.
 */
export function registerAgilePMEventAdapters(): void {
    const provider = EntryAdapterProvider.instance();

    // Product events
    registerEventAdapter(provider, ProductInitiated, (data) =>
        new ProductInitiated(
            data.tenantId as string,
            data.productId as string,
            data.name as string,
            data.description as string,
            data.productOwnerId as string
        )
    );

    registerEventAdapter(provider, ProductDescriptionChanged, (data) =>
        new ProductDescriptionChanged(
            data.tenantId as string,
            data.productId as string,
            data.description as string
        )
    );

    registerEventAdapter(provider, ProductOwnerChanged, (data) =>
        new ProductOwnerChanged(
            data.tenantId as string,
            data.productId as string,
            data.productOwnerId as string
        )
    );

    registerEventAdapter(provider, ProductDiscussionRequested, (data) =>
        new ProductDiscussionRequested(
            data.tenantId as string,
            data.productId as string
        )
    );

    // Team events
    registerEventAdapter(provider, TeamCreated, (data) =>
        new TeamCreated(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.name as string
        )
    );

    registerEventAdapter(provider, TeamMemberRegistered, (data) =>
        new TeamMemberRegistered(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string,
            data.username as string,
            data.firstName as string,
            data.lastName as string,
            data.emailAddress as string
        )
    );

    registerEventAdapter(provider, TeamMemberEmailAddressChanged, (data) =>
        new TeamMemberEmailAddressChanged(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string,
            data.emailAddress as string
        )
    );

    registerEventAdapter(provider, TeamMemberNameChanged, (data) =>
        new TeamMemberNameChanged(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string,
            data.firstName as string,
            data.lastName as string
        )
    );

    registerEventAdapter(provider, TeamMemberEnabled, (data) =>
        new TeamMemberEnabled(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string
        )
    );

    registerEventAdapter(provider, TeamMemberDisabled, (data) =>
        new TeamMemberDisabled(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string
        )
    );

    registerEventAdapter(provider, TeamMemberRemoved, (data) =>
        new TeamMemberRemoved(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.memberId as string,
            data.memberType as string
        )
    );

    registerEventAdapter(provider, TeamProductOwnerAssigned, (data) =>
        new TeamProductOwnerAssigned(
            data.tenantId as string,
            data.productId as string,
            data.teamId as string,
            data.username as string
        )
    );

    // Sprint events
    registerEventAdapter(provider, SprintPlanned, (data) =>
        new SprintPlanned(
            data.tenantId as string,
            data.productId as string,
            data.sprintId as string,
            data.name as string,
            data.goals as string,
            new Date(data.begins as string),
            new Date(data.ends as string)
        )
    );

    registerEventAdapter(provider, SprintBacklogItemCommitted, (data) =>
        new SprintBacklogItemCommitted(
            data.tenantId as string,
            data.productId as string,
            data.sprintId as string,
            data.backlogItemId as string,
            data.ordering as number
        )
    );

    registerEventAdapter(provider, SprintBacklogItemUncommitted, (data) =>
        new SprintBacklogItemUncommitted(
            data.tenantId as string,
            data.productId as string,
            data.sprintId as string,
            data.backlogItemId as string
        )
    );

    registerEventAdapter(provider, SprintRetrospectiveRecorded, (data) =>
        new SprintRetrospectiveRecorded(
            data.tenantId as string,
            data.productId as string,
            data.sprintId as string,
            data.retrospective as string
        )
    );

    // Release events
    registerEventAdapter(provider, ReleaseScheduled, (data) =>
        new ReleaseScheduled(
            data.tenantId as string,
            data.productId as string,
            data.releaseId as string,
            data.name as string,
            data.description as string,
            new Date(data.begins as string),
            new Date(data.ends as string)
        )
    );

    registerEventAdapter(provider, ReleaseArchived, (data) =>
        new ReleaseArchived(
            data.tenantId as string,
            data.productId as string,
            data.releaseId as string
        )
    );

    registerEventAdapter(provider, ReleaseBacklogItemScheduled, (data) =>
        new ReleaseBacklogItemScheduled(
            data.tenantId as string,
            data.productId as string,
            data.releaseId as string,
            data.backlogItemId as string,
            data.ordering as number
        )
    );

    registerEventAdapter(provider, ReleaseBacklogItemUnscheduled, (data) =>
        new ReleaseBacklogItemUnscheduled(
            data.tenantId as string,
            data.productId as string,
            data.releaseId as string,
            data.backlogItemId as string
        )
    );

    // BacklogItem events
    registerEventAdapter(provider, BacklogItemPlanned, (data) =>
        new BacklogItemPlanned(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.summary as string,
            data.story as string,
            data.type as string
        )
    );

    registerEventAdapter(provider, BacklogItemCommitted, (data) =>
        new BacklogItemCommitted(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.sprintId as string
        )
    );

    registerEventAdapter(provider, BacklogItemUncommitted, (data) =>
        new BacklogItemUncommitted(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.sprintId as string
        )
    );

    registerEventAdapter(provider, BacklogItemScheduled, (data) =>
        new BacklogItemScheduled(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.releaseId as string
        )
    );

    registerEventAdapter(provider, BacklogItemUnscheduled, (data) =>
        new BacklogItemUnscheduled(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.releaseId as string
        )
    );

    registerEventAdapter(provider, BacklogItemStoryPointsAssigned, (data) =>
        new BacklogItemStoryPointsAssigned(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.storyPoints as number
        )
    );

    registerEventAdapter(provider, BacklogItemTypeChanged, (data) =>
        new BacklogItemTypeChanged(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.type as string
        )
    );

    registerEventAdapter(provider, TaskDefined, (data) =>
        new TaskDefined(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.name as string,
            data.description as string
        )
    );

    registerEventAdapter(provider, TaskDescribed, (data) =>
        new TaskDescribed(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.description as string
        )
    );

    registerEventAdapter(provider, TaskHoursEstimated, (data) =>
        new TaskHoursEstimated(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.hoursEstimated as number,
            data.hoursRemaining as number
        )
    );

    registerEventAdapter(provider, TaskStatusChanged, (data) =>
        new TaskStatusChanged(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.status as string
        )
    );

    registerEventAdapter(provider, TaskVolunteerAssigned, (data) =>
        new TaskVolunteerAssigned(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.volunteerId as string
        )
    );

    registerEventAdapter(provider, BacklogItemSummarized, (data) =>
        new BacklogItemSummarized(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.summary as string
        )
    );

    registerEventAdapter(provider, BacklogItemStoryTold, (data) =>
        new BacklogItemStoryTold(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.story as string
        )
    );

    registerEventAdapter(provider, BacklogItemMarkedAsRemoved, (data) =>
        new BacklogItemMarkedAsRemoved(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string
        )
    );

    registerEventAdapter(provider, BacklogItemDiscussionRequested, (data) =>
        new BacklogItemDiscussionRequested(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            new Date(data.requestedOn as string)
        )
    );

    registerEventAdapter(provider, BacklogItemDiscussionAttached, (data) =>
        new BacklogItemDiscussionAttached(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.discussionId as string
        )
    );

    registerEventAdapter(provider, BacklogItemBusinessPriorityAssigned, (data) =>
        new BacklogItemBusinessPriorityAssigned(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.benefit as number,
            data.penalty as number,
            data.cost as number,
            data.risk as number
        )
    );

    registerEventAdapter(provider, BacklogItemStatusChanged, (data) =>
        new BacklogItemStatusChanged(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.previousStatus as string,
            data.status as string
        )
    );

    registerEventAdapter(provider, TaskRemoved, (data) =>
        new TaskRemoved(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string
        )
    );

    registerEventAdapter(provider, TaskRenamed, (data) =>
        new TaskRenamed(
            data.tenantId as string,
            data.productId as string,
            data.backlogItemId as string,
            data.taskId as string,
            data.name as string
        )
    );

    // Product discussion saga events
    registerEventAdapter(provider, ProductDiscussionAttached, (data) =>
        new ProductDiscussionAttached(
            data.tenantId as string,
            data.productId as string,
            data.discussionId as string
        )
    );

    registerEventAdapter(provider, ProductDiscussionRequestTimedOut, (data) =>
        new ProductDiscussionRequestTimedOut(
            data.tenantId as string,
            data.productId as string,
            new Date(data.timedOutOn as string)
        )
    );
}
