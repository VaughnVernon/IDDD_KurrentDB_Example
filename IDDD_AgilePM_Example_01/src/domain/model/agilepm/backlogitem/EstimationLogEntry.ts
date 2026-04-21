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

import { TaskId } from './TaskId';

/**
 * Value object representing an entry in a Task's estimation log.
 * Tracks hours remaining estimates by date, with at most one entry per day.
 */
export class EstimationLogEntry {
    private _date: Date;
    private _hoursRemaining: number;
    private readonly _taskId: TaskId;

    constructor(taskId: TaskId, date: Date, hoursRemaining: number) {
        this._taskId = taskId;
        this._date = date;
        this._hoursRemaining = hoursRemaining;
    }

    static currentLogDate(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    get date(): Date {
        return this._date;
    }

    get hoursRemaining(): number {
        return this._hoursRemaining;
    }

    get taskId(): TaskId {
        return this._taskId;
    }

    isMatching(date: Date): boolean {
        return this._date.getTime() === date.getTime();
    }

    updateHoursRemainingWhenDateMatches(hoursRemaining: number, date: Date): boolean {
        if (this.isMatching(date)) {
            this._hoursRemaining = hoursRemaining;
            return true;
        }
        return false;
    }

    equals(other: EstimationLogEntry): boolean {
        if (!other) return false;
        return this._taskId.equals(other._taskId)
            && this._date.getTime() === other._date.getTime()
            && this._hoursRemaining === other._hoursRemaining;
    }

    toString(): string {
        return `EstimationLogEntry[taskId=${this._taskId.id}, date=${this._date.toISOString()}, hoursRemaining=${this._hoursRemaining}]`;
    }
}
