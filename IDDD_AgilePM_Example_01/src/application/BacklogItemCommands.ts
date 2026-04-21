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
import { ReleaseId } from '../domain/model/agilepm/release/ReleaseId';
import { TeamMemberId } from '../domain/model/agilepm/team/TeamMemberId';
import { BacklogItemId } from '../domain/model/agilepm/backlogitem/BacklogItemId';
import { BacklogItemType } from '../domain/model/agilepm/backlogitem/BacklogItemType';
import { TaskId } from '../domain/model/agilepm/backlogitem/TaskId';
import { TaskStatus } from '../domain/model/agilepm/backlogitem/TaskStatus';
import { StoryPoints } from '../domain/model/agilepm/backlogitem/StoryPoints';
import { BacklogItem } from '../domain/model/agilepm/backlogitem/BacklogItem';
import { BusinessPriority } from '../domain/model/agilepm/backlogitem/BusinessPriority';

/**
 * Application service for BacklogItem commands.
 * Handles all backlog item-related use cases by coordinating domain operations.
 */
export class BacklogItemCommands {
    /**
     * Plan a new backlog item.
     * Generates a new BacklogItemId.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param summary - The backlog item summary
     * @param story - The user story
     * @param type - The backlog item type ('Feature', 'Enhancement', 'Defect')
     * @returns The generated backlog item ID
     */
    async planBacklogItem(
        tenantId: string,
        productId: string,
        summary: string,
        story: string,
        type: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const backlogItemId = BacklogItemId.unique();
        const backlogItemType = type as BacklogItemType;

        await BacklogItem.plan(
            tenant,
            ProductId.of(productId),
            backlogItemId,
            summary,
            story,
            backlogItemType
        );

        return backlogItemId.id;
    }

    /**
     * Commit a backlog item to a sprint.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param sprintId - The sprint identifier to commit to
     */
    async commitToSprint(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        sprintId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.commitTo(SprintId.of(sprintId));
    }

    /**
     * Uncommit a backlog item from its sprint.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     */
    async uncommit(
        tenantId: string,
        productId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.uncommit();
    }

    /**
     * Schedule a backlog item to a release.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param releaseId - The release identifier to schedule to
     */
    async scheduleToRelease(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        releaseId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.scheduleTo(ReleaseId.of(releaseId));
    }

    /**
     * Unschedule a backlog item from its release.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     */
    async unschedule(
        tenantId: string,
        productId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.unschedule();
    }

    /**
     * Assign story points to a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param storyPoints - The story points value
     */
    async assignStoryPoints(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        storyPoints: number
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.assignStoryPoints(StoryPoints.of(storyPoints));
    }

    /**
     * Change the type of a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param type - The new backlog item type ('Feature', 'Enhancement', 'Defect')
     */
    async changeType(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        type: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.changeType(type as BacklogItemType);
    }

    /**
     * Define a new task for a backlog item.
     * Generates a new TaskId.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param name - The task name
     * @param description - The task description
     * @returns The generated task ID
     */
    async defineTask(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        name: string,
        description: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const taskId = TaskId.unique();
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.defineTask(taskId, name, description);

        return taskId.id;
    }

    /**
     * Update the description of a task.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     * @param description - The new task description
     */
    async describeTask(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string,
        description: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.describeTask(TaskId.of(taskId), description);
    }

    /**
     * Estimate hours for a task.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     * @param hoursEstimated - The total hours estimated
     * @param hoursRemaining - The hours remaining
     */
    async estimateTaskHours(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string,
        hoursEstimated: number,
        hoursRemaining: number
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.estimateTaskHours(TaskId.of(taskId), hoursEstimated, hoursRemaining);
    }

    /**
     * Change the status of a task.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     * @param status - The new task status ('NotStarted', 'InProgress', 'Done')
     */
    async changeTaskStatus(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string,
        status: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.changeTaskStatus(TaskId.of(taskId), status as TaskStatus);
    }

    /**
     * Assign a volunteer to a task.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     * @param volunteerId - The team member identifier to assign
     */
    async assignTaskVolunteer(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string,
        volunteerId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.assignTaskVolunteer(TaskId.of(taskId), TeamMemberId.of(volunteerId));
    }

    /**
     * Change the summary of a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param summary - The new summary
     */
    async summarize(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        summary: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.summarize(summary);
    }

    /**
     * Change the story of a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param story - The new story
     */
    async tellStory(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        story: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.tellStory(story);
    }

    /**
     * Mark a backlog item as removed (soft delete).
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     */
    async markAsRemoved(
        tenantId: string,
        productId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.markAsRemoved();
    }

    /**
     * Request a discussion for a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     */
    async requestDiscussion(
        tenantId: string,
        productId: string,
        backlogItemId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.requestDiscussion();
    }

    /**
     * Attach a discussion to a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param discussionId - The discussion identifier from collaboration context
     */
    async attachDiscussion(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        discussionId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.attachDiscussion(discussionId);
    }

    /**
     * Assign business priority ratings to a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param benefit - The benefit rating (1-9)
     * @param penalty - The penalty rating (1-9)
     * @param cost - The cost rating (1-9)
     * @param risk - The risk rating (1-9)
     */
    async assignBusinessPriority(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        benefit: number,
        penalty: number,
        cost: number,
        risk: number
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.assignBusinessPriority(
            BusinessPriority.of(benefit, penalty, cost, risk)
        );
    }

    /**
     * Rename a task.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     * @param name - The new task name
     */
    async renameTask(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string,
        name: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.renameTask(TaskId.of(taskId), name);
    }

    /**
     * Remove a task from a backlog item.
     *
     * @param tenantId - The tenant identifier
     * @param productId - The product identifier
     * @param backlogItemId - The backlog item identifier
     * @param taskId - The task identifier
     */
    async removeTask(
        tenantId: string,
        productId: string,
        backlogItemId: string,
        taskId: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const backlogItem = BacklogItem.of(
            tenant,
            ProductId.of(productId),
            BacklogItemId.of(backlogItemId)
        );

        await backlogItem.removeTask(TaskId.of(taskId));
    }
}
