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
 * Enumeration of backlog item status values.
 * Represents the lifecycle state of a backlog item.
 */
export enum BacklogItemStatus {
    Planned = 'PLANNED',
    Scheduled = 'SCHEDULED',
    Committed = 'COMMITTED',
    Done = 'DONE',
    Removed = 'REMOVED'
}

/**
 * Helper functions for BacklogItemStatus.
 */
export namespace BacklogItemStatus {
    export function isPlanned(status: BacklogItemStatus): boolean {
        return status === BacklogItemStatus.Planned;
    }

    export function isScheduled(status: BacklogItemStatus): boolean {
        return status === BacklogItemStatus.Scheduled;
    }

    export function isCommitted(status: BacklogItemStatus): boolean {
        return status === BacklogItemStatus.Committed;
    }

    export function isDone(status: BacklogItemStatus): boolean {
        return status === BacklogItemStatus.Done;
    }

    export function isRemoved(status: BacklogItemStatus): boolean {
        return status === BacklogItemStatus.Removed;
    }

    /**
     * Get the ordinal value of a status for comparison.
     * Higher ordinal means more advanced in the workflow.
     */
    export function ordinal(status: BacklogItemStatus): number {
        switch (status) {
            case BacklogItemStatus.Planned:
                return 0;
            case BacklogItemStatus.Scheduled:
                return 1;
            case BacklogItemStatus.Committed:
                return 2;
            case BacklogItemStatus.Done:
                return 3;
            case BacklogItemStatus.Removed:
                return -1; // Special case
            default:
                return 0;
        }
    }

    /**
     * Regress to the previous logical status.
     * Used when work is added back to a completed item.
     */
    export function regress(status: BacklogItemStatus): BacklogItemStatus {
        switch (status) {
            case BacklogItemStatus.Planned:
                return BacklogItemStatus.Planned;
            case BacklogItemStatus.Scheduled:
                return BacklogItemStatus.Planned;
            case BacklogItemStatus.Committed:
                return BacklogItemStatus.Scheduled;
            case BacklogItemStatus.Done:
                return BacklogItemStatus.Committed;
            case BacklogItemStatus.Removed:
                return BacklogItemStatus.Planned;
            default:
                return BacklogItemStatus.Planned;
        }
    }
}
