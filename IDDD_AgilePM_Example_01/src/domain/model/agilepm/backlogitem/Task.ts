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

import { EstimationLogEntry } from './EstimationLogEntry';
import { TaskId } from './TaskId';
import { TaskStatus } from './TaskStatus';
import { TeamMemberId } from '../team/TeamMemberId';

/**
 * Entity representing a task within a BacklogItem.
 * Embedded within the BacklogItem aggregate.
 *
 * Tasks are the smallest unit of work that team members can
 * volunteer for and track hours against.
 */
export class Task {
    private _taskId: TaskId;
    private _name: string;
    private _description: string;
    private _status: TaskStatus;
    private _hoursEstimated: number;
    private _hoursRemaining: number;
    private _estimationLog: EstimationLogEntry[];
    private _volunteerId?: TeamMemberId;

    constructor(
        taskId: TaskId,
        name: string,
        description: string
    ) {
        if (!name?.trim()) {
            throw new Error('Task name cannot be empty');
        }

        this._taskId = taskId;
        this._name = name.trim();
        this._description = description?.trim() ?? '';
        this._status = TaskStatus.NotStarted;
        this._hoursEstimated = 0;
        this._hoursRemaining = 0;
        this._estimationLog = [];
    }

    get taskId(): TaskId {
        return this._taskId;
    }

    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get status(): TaskStatus {
        return this._status;
    }

    get hoursEstimated(): number {
        return this._hoursEstimated;
    }

    get hoursRemaining(): number {
        return this._hoursRemaining;
    }

    get estimationLog(): ReadonlyArray<EstimationLogEntry> {
        return this._estimationLog;
    }

    get volunteerId(): TeamMemberId | undefined {
        return this._volunteerId;
    }

    get hasVolunteer(): boolean {
        return !!this._volunteerId;
    }

    get isDone(): boolean {
        return this._status === TaskStatus.Done;
    }

    /**
     * Describe or update the task description.
     * Note: This is called from the aggregate, not directly.
     */
    describe(description: string): void {
        this._description = description?.trim() ?? '';
    }

    /**
     * Estimate hours for this task.
     * Note: This is called from the aggregate, not directly.
     * Automatically transitions status based on hours:
     * - If hours remaining = 0 and not done, marks as DONE
     * - If hours remaining > 0 and not in progress, marks as IN_PROGRESS
     */
    estimateHours(hoursEstimated: number, hoursRemaining: number): void {
        if (hoursEstimated < 0) {
            throw new Error('Hours estimated cannot be negative');
        }
        if (hoursRemaining < 0) {
            throw new Error('Hours remaining cannot be negative');
        }
        if (hoursRemaining > hoursEstimated) {
            throw new Error('Hours remaining cannot exceed hours estimated');
        }

        this._hoursEstimated = hoursEstimated;
        this._hoursRemaining = hoursRemaining;

        this.logEstimation(hoursRemaining);

        // Auto-transition task status based on hours
        if (hoursRemaining === 0 && !this.isDone) {
            this._status = TaskStatus.Done;
        } else if (hoursRemaining > 0 && !TaskStatus.isInProgress(this._status)) {
            this._status = TaskStatus.InProgress;
        }
    }

    /**
     * Change the task status.
     * Note: This is called from the aggregate, not directly.
     */
    changeStatus(status: TaskStatus): void {
        this._status = status;
    }

    /**
     * Assign a volunteer to this task.
     * Note: This is called from the aggregate, not directly.
     */
    assignVolunteer(volunteerId: TeamMemberId): void {
        this._volunteerId = volunteerId;
    }

    /**
     * Rename this task.
     * Note: This is called from the aggregate, not directly.
     */
    rename(name: string): void {
        if (!name?.trim()) {
            throw new Error('Task name cannot be empty');
        }
        this._name = name.trim();
    }

    private logEstimation(hoursRemaining: number): void {
        const today = EstimationLogEntry.currentLogDate();

        const updated = this._estimationLog.some(
            entry => entry.updateHoursRemainingWhenDateMatches(hoursRemaining, today)
        );

        if (!updated) {
            this._estimationLog.push(
                new EstimationLogEntry(this._taskId, today, hoursRemaining)
            );
        }
    }

    equals(other: Task): boolean {
        if (!other) return false;
        return this._taskId.equals(other._taskId);
    }
}
