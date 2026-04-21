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
import { SprintId } from '../sprint/SprintId';
import { ReleaseId } from '../release/ReleaseId';
import { TeamMemberId } from '../team/TeamMemberId';
import { BacklogItemId } from './BacklogItemId';
import { TaskId } from './TaskId';
import { Task } from './Task';
import { BacklogItemStatus } from './BacklogItemStatus';
import { BacklogItemType } from './BacklogItemType';
import { TaskStatus } from './TaskStatus';
import { StoryPoints } from './StoryPoints';
import {
    BacklogItemPlanned,
    BacklogItemCommitted,
    BacklogItemUncommitted,
    BacklogItemScheduled,
    BacklogItemUnscheduled,
    BacklogItemStoryPointsAssigned,
    BacklogItemTypeChanged,
    BacklogItemSummarized,
    BacklogItemStoryTold,
    BacklogItemMarkedAsRemoved,
    BacklogItemDiscussionRequested,
    BacklogItemDiscussionAttached,
    BacklogItemBusinessPriorityAssigned,
    BacklogItemStatusChanged,
    TaskDefined,
    TaskDescribed,
    TaskHoursEstimated,
    TaskStatusChanged,
    TaskVolunteerAssigned,
    TaskRemoved,
    TaskRenamed
} from './events';
import { BusinessPriority } from './BusinessPriority';

/**
 * Protocol for BacklogItem aggregate operations.
 *
 * A BacklogItem represents a unit of work (user story, feature, defect) to be
 * delivered. It contains tasks which are the smallest trackable work units.
 *
 * This is a command-only interface following CQRS principles.
 * Queries should be performed via read models/projections.
 */
export interface BacklogItem extends ActorProtocol {
    /**
     * Plan a new backlog item (initial creation command).
     */
    plan(
        summary: string,
        story: string,
        type: BacklogItemType
    ): Promise<void>;

    /**
     * Commit this backlog item to a sprint.
     */
    commitTo(sprintId: SprintId): Promise<void>;

    /**
     * Uncommit this backlog item from its sprint.
     */
    uncommit(): Promise<void>;

    /**
     * Schedule this backlog item to a release.
     */
    scheduleTo(releaseId: ReleaseId): Promise<void>;

    /**
     * Unschedule this backlog item from its release.
     */
    unschedule(): Promise<void>;

    /**
     * Assign story points to this backlog item.
     */
    assignStoryPoints(storyPoints: StoryPoints): Promise<void>;

    /**
     * Change the type of this backlog item.
     */
    changeType(type: BacklogItemType): Promise<void>;

    /**
     * Define a new task for this backlog item.
     */
    defineTask(taskId: TaskId, name: string, description: string): Promise<void>;

    /**
     * Describe (update the description of) a task.
     */
    describeTask(taskId: TaskId, description: string): Promise<void>;

    /**
     * Estimate hours for a task.
     */
    estimateTaskHours(taskId: TaskId, hoursEstimated: number, hoursRemaining: number): Promise<void>;

    /**
     * Change the status of a task.
     */
    changeTaskStatus(taskId: TaskId, status: TaskStatus): Promise<void>;

    /**
     * Assign a volunteer to a task.
     */
    assignTaskVolunteer(taskId: TaskId, volunteerId: TeamMemberId): Promise<void>;

    /**
     * Change the summary of this backlog item.
     */
    summarize(summary: string): Promise<void>;

    /**
     * Change the story of this backlog item.
     */
    tellStory(story: string): Promise<void>;

    /**
     * Mark this backlog item as removed (soft delete).
     */
    markAsRemoved(): Promise<void>;

    /**
     * Request a discussion for this backlog item.
     */
    requestDiscussion(): Promise<void>;

    /**
     * Attach a discussion to this backlog item.
     */
    attachDiscussion(discussionId: string): Promise<void>;

    /**
     * Assign business priority to this backlog item.
     */
    assignBusinessPriority(businessPriority: BusinessPriority): Promise<void>;

    /**
     * Rename a task.
     */
    renameTask(taskId: TaskId, name: string): Promise<void>;

    /**
     * Remove a task from this backlog item.
     */
    removeTask(taskId: TaskId): Promise<void>;
}

/**
 * Namespace for BacklogItem factory functions.
 */
export namespace BacklogItem {
    /**
     * Generate stream name for a BacklogItem.
     */
    export function streamNameFor(tenant: Tenant, backlogItemId: BacklogItemId): string {
        return `BacklogItem-${tenant.id}-${backlogItemId.id}`;
    }

    /**
     * Plan a new BacklogItem as an actor.
     *
     * @param tenant - The tenant this backlog item belongs to
     * @param productId - The product this backlog item belongs to
     * @param backlogItemId - The unique backlog item identifier
     * @param summary - The summary of the backlog item
     * @param story - The user story
     * @param type - The type of backlog item
     * @returns A BacklogItem actor that has been planned
     */
    export async function plan(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId,
        summary: string,
        story: string,
        type: BacklogItemType
    ): Promise<BacklogItem> {
        const backlogItem = stage().actorFor<BacklogItem>(
            backlogItemProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            backlogItemId
        );

        await backlogItem.plan(summary, story, type);

        return backlogItem;
    }

    /**
     * Get an existing BacklogItem actor by its identifiers.
     *
     * @param tenant - The tenant this backlog item belongs to
     * @param productId - The product this backlog item belongs to
     * @param backlogItemId - The unique backlog item identifier
     * @returns A BacklogItem actor reference
     */
    export function of(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId
    ): BacklogItem {
        return stage().actorFor<BacklogItem>(
            backlogItemProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            backlogItemId
        );
    }
}


/**
 * Protocol for creating BacklogItemActor instances.
 */
const backlogItemProtocol: Protocol = {
    type: () => 'BacklogItem',
    instantiator: () => ({
        instantiate: (def: Definition) => {
            const [tenant, productId, backlogItemId] = def.parameters();
            return new BacklogItemActor(
                tenant as Tenant,
                productId as ProductId,
                backlogItemId as BacklogItemId
            );
        }
    })
};

/**
 * Event-sourced BacklogItem actor implementation.
 */
class BacklogItemActor extends EventSourcedEntity implements BacklogItem {
    private _tenant!: Tenant;
    private _productId!: ProductId;
    private _backlogItemId!: BacklogItemId;
    private _summary!: string;
    private _story!: string;
    private _type!: BacklogItemType;
    private _status!: BacklogItemStatus;
    private _storyPoints?: StoryPoints;
    private _sprintId?: SprintId;
    private _releaseId?: ReleaseId;
    private _tasks: Map<string, Task> = new Map();
    private _discussionRequested: boolean = false;
    private _discussionId?: string;
    private _businessPriority?: BusinessPriority;
    private _removed: boolean = false;

    /**
     * Register event consumers for state reconstruction.
     */
    static {
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemPlanned,
            (item, event) => item.whenBacklogItemPlanned(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemCommitted,
            (item, event) => item.whenBacklogItemCommitted(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemUncommitted,
            (item, event) => item.whenBacklogItemUncommitted(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemScheduled,
            (item, event) => item.whenBacklogItemScheduled(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemUnscheduled,
            (item, event) => item.whenBacklogItemUnscheduled(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemStoryPointsAssigned,
            (item, event) => item.whenBacklogItemStoryPointsAssigned(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemTypeChanged,
            (item, event) => item.whenBacklogItemTypeChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskDefined,
            (item, event) => item.whenTaskDefined(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskDescribed,
            (item, event) => item.whenTaskDescribed(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskHoursEstimated,
            (item, event) => item.whenTaskHoursEstimated(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskStatusChanged,
            (item, event) => item.whenTaskStatusChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskVolunteerAssigned,
            (item, event) => item.whenTaskVolunteerAssigned(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemSummarized,
            (item, event) => item.whenBacklogItemSummarized(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemStoryTold,
            (item, event) => item.whenBacklogItemStoryTold(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemMarkedAsRemoved,
            (item, event) => item.whenBacklogItemMarkedAsRemoved(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemDiscussionRequested,
            (item, event) => item.whenBacklogItemDiscussionRequested(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemDiscussionAttached,
            (item, event) => item.whenBacklogItemDiscussionAttached(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemBusinessPriorityAssigned,
            (item, event) => item.whenBacklogItemBusinessPriorityAssigned(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskRemoved,
            (item, event) => item.whenTaskRemoved(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, TaskRenamed,
            (item, event) => item.whenTaskRenamed(event)
        );
        EventSourcedEntity.registerConsumer(
            BacklogItemActor, BacklogItemStatusChanged,
            (item, event) => item.whenBacklogItemStatusChanged(event)
        );
    }

    constructor(tenant: Tenant, productId: ProductId, backlogItemId: BacklogItemId) {
        super(BacklogItem.streamNameFor(tenant, backlogItemId));
        this._tenant = tenant;
        this._productId = productId;
        this._backlogItemId = backlogItemId;
    }

    // Command methods

    async plan(
        summary: string,
        story: string,
        type: BacklogItemType
    ): Promise<void> {
        if (this._summary) {
            return;
        }

        if (!summary?.trim()) {
            throw new Error('Summary cannot be empty');
        }
        if (summary.trim().length > 100) {
            throw new Error('Summary must be 100 characters or less');
        }
        if (story && story.trim().length > 65000) {
            throw new Error('Story must be 65000 characters or less');
        }

        await this.apply(BacklogItemPlanned.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            summary.trim(),
            story?.trim() ?? '',
            type
        ));
    }

    async commitTo(sprintId: SprintId): Promise<void> {
        if (this._status === BacklogItemStatus.Committed) {
            throw new Error('Backlog item is already committed');
        }
        if (this._status === BacklogItemStatus.Done) {
            throw new Error('Cannot commit a done backlog item');
        }
        if (this._status === BacklogItemStatus.Removed) {
            throw new Error('Cannot commit a removed backlog item');
        }
        if (!this.isScheduledForRelease()) {
            throw new Error('Must be scheduled for release to commit to sprint');
        }

        await this.apply(BacklogItemCommitted.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            sprintId
        ));
    }

    /**
     * Check if this backlog item is scheduled for a release.
     */
    private isScheduledForRelease(): boolean {
        return !!this._releaseId;
    }

    /**
     * Check if this backlog item is committed to a sprint.
     */
    private isCommittedToSprint(): boolean {
        return !!this._sprintId;
    }

    /**
     * Calculate total hours remaining across all tasks.
     */
    private totalTaskHoursRemaining(): number {
        let total = 0;
        for (const task of this._tasks.values()) {
            total += task.hoursRemaining;
        }
        return total;
    }

    /**
     * Check if any task has hours remaining.
     */
    private anyTaskHoursRemaining(): boolean {
        return this.totalTaskHoursRemaining() > 0;
    }

    async uncommit(): Promise<void> {
        if (this._status !== BacklogItemStatus.Committed) {
            throw new Error('Backlog item is not committed');
        }
        if (!this._sprintId) {
            throw new Error('Backlog item has no sprint');
        }

        await this.apply(BacklogItemUncommitted.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            this._sprintId
        ));
    }

    async scheduleTo(releaseId: ReleaseId): Promise<void> {
        if (this._releaseId) {
            throw new Error('Backlog item is already scheduled to a release');
        }
        if (this._status === BacklogItemStatus.Removed) {
            throw new Error('Cannot schedule a removed backlog item');
        }

        await this.apply(BacklogItemScheduled.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            releaseId
        ));
    }

    async unschedule(): Promise<void> {
        if (!this._releaseId) {
            throw new Error('Backlog item is not scheduled to any release');
        }
        if (this.isCommittedToSprint()) {
            throw new Error('Must first uncommit from sprint');
        }

        await this.apply(BacklogItemUnscheduled.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            this._releaseId
        ));
    }

    async assignStoryPoints(storyPoints: StoryPoints): Promise<void> {
        await this.apply(BacklogItemStoryPointsAssigned.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            storyPoints
        ));
    }

    async changeType(type: BacklogItemType): Promise<void> {
        if (this._type === type) {
            return; // No change needed
        }

        await this.apply(BacklogItemTypeChanged.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            type
        ));
    }

    async defineTask(taskId: TaskId, name: string, description: string): Promise<void> {
        if (this._tasks.has(taskId.id)) {
            throw new Error('Task already exists');
        }
        if (!name?.trim()) {
            throw new Error('Task name cannot be empty');
        }

        await this.apply(TaskDefined.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            name.trim(),
            description?.trim() ?? ''
        ));
    }

    async describeTask(taskId: TaskId, description: string): Promise<void> {
        if (!this._tasks.has(taskId.id)) {
            throw new Error('Task not found');
        }

        await this.apply(TaskDescribed.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            description?.trim() ?? ''
        ));
    }

    async estimateTaskHours(taskId: TaskId, hoursEstimated: number, hoursRemaining: number): Promise<void> {
        if (!this._tasks.has(taskId.id)) {
            throw new Error('Task not found');
        }
        if (hoursEstimated < 0) {
            throw new Error('Hours estimated cannot be negative');
        }
        if (hoursRemaining < 0) {
            throw new Error('Hours remaining cannot be negative');
        }
        if (hoursRemaining > hoursEstimated) {
            throw new Error('Hours remaining cannot exceed hours estimated');
        }

        await this.apply(TaskHoursEstimated.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            hoursEstimated,
            hoursRemaining
        ));

        // Check for automatic status transitions
        let newStatus: BacklogItemStatus | null = null;

        if (hoursRemaining === 0) {
            // If all task hours are now zero, mark as DONE
            if (!this.anyTaskHoursRemaining()) {
                newStatus = BacklogItemStatus.Done;
            }
        } else if (this._status === BacklogItemStatus.Done) {
            // Hours added back - regress from DONE to previous logical state
            if (this.isCommittedToSprint()) {
                newStatus = BacklogItemStatus.Committed;
            } else if (this.isScheduledForRelease()) {
                newStatus = BacklogItemStatus.Scheduled;
            } else {
                newStatus = BacklogItemStatus.Planned;
            }
        }

        if (newStatus !== null && newStatus !== this._status) {
            await this.apply(BacklogItemStatusChanged.with(
                this._tenant,
                this._productId,
                this._backlogItemId,
                this._status,
                newStatus
            ));
        }
    }

    async changeTaskStatus(taskId: TaskId, status: TaskStatus): Promise<void> {
        const task = this._tasks.get(taskId.id);
        if (!task) {
            throw new Error('Task not found');
        }
        if (task.status === status) {
            return; // No change needed
        }

        await this.apply(TaskStatusChanged.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            status
        ));
    }

    async assignTaskVolunteer(taskId: TaskId, volunteerId: TeamMemberId): Promise<void> {
        const task = this._tasks.get(taskId.id);
        if (!task) {
            throw new Error('Task not found');
        }
        if (task.volunteerId?.equals(volunteerId)) {
            return; // Already assigned to this volunteer
        }

        await this.apply(TaskVolunteerAssigned.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            volunteerId
        ));
    }

    async summarize(summary: string): Promise<void> {
        this.assertNotRemoved();
        if (!summary?.trim()) {
            throw new Error('Summary cannot be empty');
        }
        if (summary.trim().length > 100) {
            throw new Error('Summary must be 100 characters or less');
        }
        if (summary.trim() === this._summary) {
            return; // No change needed
        }

        await this.apply(BacklogItemSummarized.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            summary.trim()
        ));
    }

    async tellStory(story: string): Promise<void> {
        this.assertNotRemoved();
        if (story && story.trim().length > 65000) {
            throw new Error('Story must be 65000 characters or less');
        }
        if (story?.trim() === this._story) {
            return; // No change needed
        }

        await this.apply(BacklogItemStoryTold.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            story?.trim() ?? ''
        ));
    }

    async markAsRemoved(): Promise<void> {
        if (this._removed) {
            throw new Error('Already removed, not outstanding');
        }
        if (this._status === BacklogItemStatus.Done) {
            throw new Error('Already done, not outstanding');
        }

        // Auto-uncommit from sprint if committed
        if (this.isCommittedToSprint()) {
            await this.uncommit();
        }

        // Auto-unschedule from release if scheduled
        if (this.isScheduledForRelease()) {
            await this.unschedule();
        }

        await this.apply(BacklogItemMarkedAsRemoved.with(
            this._tenant,
            this._productId,
            this._backlogItemId
        ));
    }

    async requestDiscussion(): Promise<void> {
        this.assertNotRemoved();
        if (this._discussionRequested || this._discussionId) {
            return; // Already requested or initiated
        }

        await this.apply(BacklogItemDiscussionRequested.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            new Date()
        ));
    }

    async attachDiscussion(discussionId: string): Promise<void> {
        this.assertNotRemoved();
        if (!discussionId?.trim()) {
            throw new Error('Discussion ID cannot be empty');
        }
        if (this._discussionId) {
            throw new Error('Discussion already attached');
        }

        await this.apply(BacklogItemDiscussionAttached.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            discussionId.trim()
        ));
    }

    async assignBusinessPriority(businessPriority: BusinessPriority): Promise<void> {
        this.assertNotRemoved();

        await this.apply(BacklogItemBusinessPriorityAssigned.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            businessPriority
        ));
    }

    async renameTask(taskId: TaskId, name: string): Promise<void> {
        this.assertNotRemoved();
        const task = this._tasks.get(taskId.id);
        if (!task) {
            throw new Error('Task not found');
        }
        if (!name?.trim()) {
            throw new Error('Task name cannot be empty');
        }
        if (task.name === name.trim()) {
            return; // No change needed
        }

        await this.apply(TaskRenamed.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId,
            name.trim()
        ));
    }

    async removeTask(taskId: TaskId): Promise<void> {
        this.assertNotRemoved();
        const task = this._tasks.get(taskId.id);
        if (!task) {
            throw new Error('Task not found');
        }

        await this.apply(TaskRemoved.with(
            this._tenant,
            this._productId,
            this._backlogItemId,
            taskId
        ));
    }

    private assertNotRemoved(): void {
        if (this._removed) {
            throw new Error('Backlog item has been removed');
        }
    }

    // Event handlers (state mutators)

    private whenBacklogItemPlanned(event: BacklogItemPlanned): void {
        this._tenant = Tenant.of(event.tenantId);
        this._productId = ProductId.of(event.productId);
        this._backlogItemId = BacklogItemId.of(event.backlogItemId);
        this._summary = event.summary;
        this._story = event.story;
        this._type = event.type as BacklogItemType;
        this._status = BacklogItemStatus.Planned;
    }

    private whenBacklogItemCommitted(event: BacklogItemCommitted): void {
        this._sprintId = SprintId.of(event.sprintId);
        // Only elevate status if currently at SCHEDULED level
        // This prevents downgrading status if already at a higher level
        this.elevateStatusWith(BacklogItemStatus.Committed);
    }

    /**
     * Elevate status to the given level only if currently lower.
     * Prevents accidentally downgrading status.
     */
    private elevateStatusWith(targetStatus: BacklogItemStatus): void {
        if (this._status === BacklogItemStatus.Scheduled) {
            this._status = BacklogItemStatus.Committed;
        }
    }

    private whenBacklogItemUncommitted(_event: BacklogItemUncommitted): void {
        this._sprintId = undefined;
        this._status = this._releaseId
            ? BacklogItemStatus.Scheduled
            : BacklogItemStatus.Planned;
    }

    private whenBacklogItemScheduled(event: BacklogItemScheduled): void {
        this._releaseId = ReleaseId.of(event.releaseId);
        if (this._status === BacklogItemStatus.Planned) {
            this._status = BacklogItemStatus.Scheduled;
        }
    }

    private whenBacklogItemUnscheduled(_event: BacklogItemUnscheduled): void {
        this._releaseId = undefined;
        if (this._status === BacklogItemStatus.Scheduled) {
            this._status = BacklogItemStatus.Planned;
        }
    }

    private whenBacklogItemStoryPointsAssigned(event: BacklogItemStoryPointsAssigned): void {
        this._storyPoints = StoryPoints.of(event.storyPoints);
    }

    private whenBacklogItemTypeChanged(event: BacklogItemTypeChanged): void {
        this._type = event.type as BacklogItemType;
    }

    private whenTaskDefined(event: TaskDefined): void {
        const task = new Task(
            TaskId.of(event.taskId),
            event.name,
            event.description
        );
        this._tasks.set(event.taskId, task);
    }

    private whenTaskDescribed(event: TaskDescribed): void {
        const task = this._tasks.get(event.taskId);
        if (task) {
            task.describe(event.description);
        }
    }

    private whenTaskHoursEstimated(event: TaskHoursEstimated): void {
        const task = this._tasks.get(event.taskId);
        if (task) {
            task.estimateHours(event.hoursEstimated, event.hoursRemaining);
        }
    }

    private whenTaskStatusChanged(event: TaskStatusChanged): void {
        const task = this._tasks.get(event.taskId);
        if (task) {
            task.changeStatus(event.status as TaskStatus);
        }
    }

    private whenTaskVolunteerAssigned(event: TaskVolunteerAssigned): void {
        const task = this._tasks.get(event.taskId);
        if (task) {
            task.assignVolunteer(TeamMemberId.from(event.volunteerId));
        }
    }

    private whenBacklogItemSummarized(event: BacklogItemSummarized): void {
        this._summary = event.summary;
    }

    private whenBacklogItemStoryTold(event: BacklogItemStoryTold): void {
        this._story = event.story;
    }

    private whenBacklogItemMarkedAsRemoved(_event: BacklogItemMarkedAsRemoved): void {
        this._removed = true;
        this._status = BacklogItemStatus.Removed;
    }

    private whenBacklogItemDiscussionRequested(_event: BacklogItemDiscussionRequested): void {
        this._discussionRequested = true;
    }

    private whenBacklogItemDiscussionAttached(event: BacklogItemDiscussionAttached): void {
        this._discussionId = event.discussionId;
        this._discussionRequested = false;
    }

    private whenBacklogItemBusinessPriorityAssigned(event: BacklogItemBusinessPriorityAssigned): void {
        this._businessPriority = BusinessPriority.of(
            event.benefit,
            event.penalty,
            event.cost,
            event.risk
        );
    }

    private whenTaskRemoved(event: TaskRemoved): void {
        this._tasks.delete(event.taskId);
    }

    private whenTaskRenamed(event: TaskRenamed): void {
        const task = this._tasks.get(event.taskId);
        if (task) {
            task.rename(event.name);
        }
    }

    private whenBacklogItemStatusChanged(event: BacklogItemStatusChanged): void {
        this._status = event.status as BacklogItemStatus;
    }
}
