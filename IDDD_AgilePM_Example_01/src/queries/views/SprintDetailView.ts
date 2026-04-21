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
 * View of a committed backlog item within a sprint.
 */
export interface CommittedBacklogItemView {
    backlogItemId: string;
    ordering: number;
}

/**
 * Detailed view of a Sprint for single-item queries.
 */
export interface SprintDetailView {
    tenantId: string;
    productId: string;
    sprintId: string;
    name: string;
    goals: string;
    begins: string;
    ends: string;
    committedBacklogItems: CommittedBacklogItemView[];
}
