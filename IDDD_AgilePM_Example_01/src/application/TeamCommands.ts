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
import { TeamId } from '../domain/model/agilepm/team/TeamId';
import { MemberType } from '../domain/model/agilepm/team/MemberType';
import { Team } from '../domain/model/agilepm/team/Team';

/**
 * Application service for Team commands.
 * Handles all team-related use cases including member management.
 */
export class TeamCommands {
    /**
     * Form a new team.
     *
     * @returns The generated team ID
     */
    async formTeam(
        tenantId: string,
        productId: string,
        name: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const teamId = TeamId.generate();

        await Team.form(tenant, ProductId.of(productId), teamId, name);

        return teamId.id;
    }

    /**
     * Register a product owner as a member of the team.
     * The username serves as the member identity.
     *
     * @returns The username (which is the member identity)
     */
    async registerProductOwner(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.registerMember(MemberType.ProductOwner, username, firstName, lastName, emailAddress);

        return username;
    }

    /**
     * Register a team member.
     * The username serves as the member identity.
     *
     * @returns The username (which is the member identity)
     */
    async registerTeamMember(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string
    ): Promise<string> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.registerMember(MemberType.TeamMember, username, firstName, lastName, emailAddress);

        return username;
    }

    /**
     * Change a member's email address.
     */
    async changeMemberEmailAddress(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string,
        emailAddress: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.changeMemberEmailAddress(username, emailAddress);
    }

    /**
     * Change a member's name.
     */
    async changeMemberName(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string,
        firstName: string,
        lastName: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.changeMemberName(username, firstName, lastName);
    }

    /**
     * Enable a member.
     */
    async enableMember(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.enableMember(username);
    }

    /**
     * Disable a member.
     */
    async disableMember(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.disableMember(username);
    }

    /**
     * Remove a member from the team.
     */
    async removeMember(
        tenantId: string,
        productId: string,
        teamId: string,
        username: string
    ): Promise<void> {
        const tenant = Tenant.of(tenantId);
        const team = Team.of(tenant, ProductId.of(productId), TeamId.of(teamId));

        await team.removeMember(username);
    }
}
