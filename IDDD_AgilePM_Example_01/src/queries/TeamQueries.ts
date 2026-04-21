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

import { type DocumentStore } from 'domo-tactical';
import { type TeamDetailView } from './views/TeamDetailView';
import { type TeamSummaryView } from './views/TeamSummaryView';
import { type TenantTeamIndexView } from './views/TenantIndexView';

const DETAIL_VIEW_TYPE = 'TeamDetailView';
const INDEX_TYPE = 'TenantTeamIndexView';

/**
 * Query service for Team read models.
 * Reads from DocumentStore to serve team queries.
 */
export class TeamQueries {
    constructor(private readonly documentStore: DocumentStore) {}

    private viewId(tenantId: string, teamId: string): string {
        return `${tenantId}:${teamId}`;
    }

    async teamById(tenantId: string, teamId: string): Promise<TeamDetailView | null> {
        const id = this.viewId(tenantId, teamId);
        const result = await this.documentStore.read<TeamDetailView>(id, DETAIL_VIEW_TYPE);
        return result.state;
    }

    async allTeams(tenantId: string): Promise<TeamSummaryView[]> {
        const result = await this.documentStore.read<TenantTeamIndexView>(tenantId, INDEX_TYPE);
        return result.state?.teams ?? [];
    }
}
