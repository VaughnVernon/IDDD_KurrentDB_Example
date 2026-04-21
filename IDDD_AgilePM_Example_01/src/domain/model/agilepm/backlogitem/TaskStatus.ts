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
 * Enumeration of task status values.
 * Represents the lifecycle state of a task within a backlog item.
 */
export enum TaskStatus {
    NotStarted = 'NOT_STARTED',
    InProgress = 'IN_PROGRESS',
    Impediment = 'IMPEDIMENT',
    Done = 'DONE'
}

/**
 * Helper functions for TaskStatus.
 */
export namespace TaskStatus {
    export function isNotStarted(status: TaskStatus): boolean {
        return status === TaskStatus.NotStarted;
    }

    export function isInProgress(status: TaskStatus): boolean {
        return status === TaskStatus.InProgress;
    }

    export function hasImpediment(status: TaskStatus): boolean {
        return status === TaskStatus.Impediment;
    }

    export function isDone(status: TaskStatus): boolean {
        return status === TaskStatus.Done;
    }
}
