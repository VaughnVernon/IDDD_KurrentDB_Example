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

import { type SprintSummaryView } from './SprintSummaryView';
import { type ReleaseSummaryView } from './ReleaseSummaryView';
import { type BacklogItemSummaryView } from './BacklogItemSummaryView';

/**
 * Index view containing all sprint summaries for a product.
 */
export interface ProductSprintIndexView {
    tenantId: string;
    productId: string;
    sprints: SprintSummaryView[];
}

/**
 * Index view containing all release summaries for a product.
 */
export interface ProductReleaseIndexView {
    tenantId: string;
    productId: string;
    releases: ReleaseSummaryView[];
}

/**
 * Index view containing all backlog item summaries for a product.
 */
export interface ProductBacklogItemIndexView {
    tenantId: string;
    productId: string;
    backlogItems: BacklogItemSummaryView[];
}
