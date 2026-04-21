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

import { BacklogItemId } from '../backlogitem/BacklogItemId';

/**
 * Entity representing a backlog item scheduled for a Release.
 * Embedded within the Release aggregate.
 */
export class ScheduledBacklogItem {
    private readonly _backlogItemId: BacklogItemId;
    private readonly _ordering: number;

    constructor(
        backlogItemId: BacklogItemId,
        ordering: number
    ) {
        if (ordering < 0) {
            throw new Error('Ordering must be non-negative');
        }

        this._backlogItemId = backlogItemId;
        this._ordering = ordering;
    }

    get backlogItemId(): BacklogItemId {
        return this._backlogItemId;
    }

    get ordering(): number {
        return this._ordering;
    }

    equals(other: ScheduledBacklogItem): boolean {
        if (!other) return false;
        return this._backlogItemId.equals(other._backlogItemId);
    }
}
