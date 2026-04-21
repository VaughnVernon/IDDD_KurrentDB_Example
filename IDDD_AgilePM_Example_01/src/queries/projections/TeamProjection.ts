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

import { Actor } from 'domo-actors';
import { type Projection, type Projectable, type ProjectionControl, type DocumentStore } from 'domo-tactical';
import { type TeamDetailView, type TeamMemberView } from '../views/TeamDetailView';
import { type TeamSummaryView } from '../views/TeamSummaryView';

const DETAIL_VIEW_TYPE = 'TeamDetailView';
const SUMMARY_VIEW_TYPE = 'TeamSummaryView';

/**
 * Projection that maintains TeamDetailView and TeamSummaryView.
 * Handles all Team-related events.
 */
export class TeamProjection extends Actor implements Projection {
    constructor(private readonly documentStore: DocumentStore) {
        super();
    }

    async projectWith(projectable: Projectable, control: ProjectionControl): Promise<void> {
        try {
            for (const entry of projectable.entries()) {
                const eventData = JSON.parse(entry.entryData as string);

                switch (entry.type) {
                    case 'TeamCreated':
                        await this.onTeamCreated(eventData);
                        break;
                    case 'TeamMemberRegistered':
                        await this.onTeamMemberRegistered(eventData);
                        break;
                    case 'TeamMemberRemoved':
                        await this.onTeamMemberRemoved(eventData);
                        break;
                }
            }

            control.confirmProjected(projectable);
        } catch (error) {
            control.error(error as Error);
        }
    }

    private viewId(tenantId: string, teamId: string): string {
        return `${tenantId}:${teamId}`;
    }

    private async onTeamCreated(event: {
        tenantId: string;
        teamId: string;
        name: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.teamId);

        const detailView: TeamDetailView = {
            tenantId: event.tenantId,
            teamId: event.teamId,
            name: event.name,
            members: []
        };

        const summaryView: TeamSummaryView = {
            tenantId: event.tenantId,
            teamId: event.teamId,
            name: event.name,
            memberCount: 0
        };

        await this.documentStore.write(id, DETAIL_VIEW_TYPE, detailView, 1);
        await this.documentStore.write(id, SUMMARY_VIEW_TYPE, summaryView, 1);
    }

    private async onTeamMemberRegistered(event: {
        tenantId: string;
        teamId: string;
        memberId: string;
        memberType: string;
        username: string;
        firstName: string;
        lastName: string;
        emailAddress: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.teamId);

        const member: TeamMemberView = {
            memberId: event.memberId,
            memberType: event.memberType,
            username: event.username,
            firstName: event.firstName,
            lastName: event.lastName,
            emailAddress: event.emailAddress
        };

        const detailResult = await this.documentStore.read<TeamDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                members: [...detailResult.state.members, member]
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<TeamSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                memberCount: summaryResult.state.memberCount + 1
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }

    private async onTeamMemberRemoved(event: {
        tenantId: string;
        teamId: string;
        memberId: string;
    }): Promise<void> {
        const id = this.viewId(event.tenantId, event.teamId);

        const detailResult = await this.documentStore.read<TeamDetailView>(id, DETAIL_VIEW_TYPE);
        if (detailResult.state) {
            const updated = {
                ...detailResult.state,
                members: detailResult.state.members.filter(m => m.memberId !== event.memberId)
            };
            await this.documentStore.write(id, DETAIL_VIEW_TYPE, updated, detailResult.stateVersion + 1);
        }

        const summaryResult = await this.documentStore.read<TeamSummaryView>(id, SUMMARY_VIEW_TYPE);
        if (summaryResult.state) {
            const updated = {
                ...summaryResult.state,
                memberCount: Math.max(0, summaryResult.state.memberCount - 1)
            };
            await this.documentStore.write(id, SUMMARY_VIEW_TYPE, updated, summaryResult.stateVersion + 1);
        }
    }
}
