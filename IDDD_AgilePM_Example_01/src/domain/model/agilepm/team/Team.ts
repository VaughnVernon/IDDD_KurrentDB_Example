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

import { stage, type Protocol, type Definition, type ActorProtocol } from 'domo-actors';
import { EventSourcedEntity } from 'domo-tactical';
import { Tenant } from '../tenant/Tenant';
import { ProductId } from '../product/ProductId';
import { TeamId } from './TeamId';
import { Member } from './Member';
import { MemberType } from './MemberType';
import { ProductOwner } from './ProductOwner';
import { TeamMember } from './TeamMember';
import {
    TeamCreated,
    TeamMemberRegistered,
    TeamMemberEmailAddressChanged,
    TeamMemberNameChanged,
    TeamMemberEnabled,
    TeamMemberDisabled,
    TeamMemberRemoved,
    TeamProductOwnerAssigned
} from './events';

/**
 * Protocol for Team aggregate operations.
 *
 * A Team represents a group of people working together on a Product.
 * Members (ProductOwners and TeamMembers) are entities within this aggregate.
 *
 * This is a command-only interface following CQRS principles.
 * Queries should be performed via read models/projections.
 */
export interface Team extends ActorProtocol {
    /**
     * Form a new team (initial creation command).
     */
    form(name: string): Promise<void>;

    /**
     * Register a member to this team.
     * The username serves as the member identity (scoped by tenant).
     */
    registerMember(
        memberType: MemberType,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string
    ): Promise<void>;

    /**
     * Assign a product owner to this team.
     * The product owner must already be a registered member.
     */
    assignProductOwner(productOwner: ProductOwner): Promise<void>;

    /**
     * Change a member's email address.
     */
    changeMemberEmailAddress(username: string, emailAddress: string): Promise<void>;

    /**
     * Change a member's name.
     */
    changeMemberName(username: string, firstName: string, lastName: string): Promise<void>;

    /**
     * Enable a member.
     */
    enableMember(username: string): Promise<void>;

    /**
     * Disable a member.
     */
    disableMember(username: string): Promise<void>;

    /**
     * Remove a member from this team.
     */
    removeMember(username: string): Promise<void>;
}

/**
 * Namespace for Team factory functions.
 */
export namespace Team {
    /**
     * Generate stream name for a Team.
     */
    export function streamNameFor(tenant: Tenant, teamId: TeamId): string {
        return `Team-${tenant.id}-${teamId.id}`;
    }

    /**
     * Form a new Team as an actor.
     */
    export async function form(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId,
        name: string
    ): Promise<Team> {
        const team = stage().actorFor<Team>(
            teamProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            teamId
        );

        await team.form(name);

        return team;
    }

    /**
     * Get an existing Team actor by its identifiers.
     */
    export function of(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId
    ): Team {
        return stage().actorFor<Team>(
            teamProtocol,
            undefined,
            'default',
            undefined,
            tenant,
            productId,
            teamId
        );
    }
}


/**
 * Protocol for creating TeamActor instances.
 */
const teamProtocol: Protocol = {
    type: () => 'Team',
    instantiator: () => ({
        instantiate: (def: Definition) => {
            const [tenant, productId, teamId] = def.parameters();
            return new TeamActor(tenant as Tenant, productId as ProductId, teamId as TeamId);
        }
    })
};

/**
 * Event-sourced Team actor implementation.
 */
class TeamActor extends EventSourcedEntity implements Team {
    private _tenant!: Tenant;
    private _productId!: ProductId;
    private _teamId!: TeamId;
    private _name!: string;
    private _members: Map<string, Member> = new Map();
    private _productOwner: ProductOwner | undefined;

    /**
     * Register event consumers for state reconstruction.
     */
    static {
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamCreated,
            (team, event) => team.whenTeamCreated(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberRegistered,
            (team, event) => team.whenTeamMemberRegistered(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberEmailAddressChanged,
            (team, event) => team.whenTeamMemberEmailAddressChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberNameChanged,
            (team, event) => team.whenTeamMemberNameChanged(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberEnabled,
            (team, event) => team.whenTeamMemberEnabled(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberDisabled,
            (team, event) => team.whenTeamMemberDisabled(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamMemberRemoved,
            (team, event) => team.whenTeamMemberRemoved(event)
        );
        EventSourcedEntity.registerConsumer(
            TeamActor, TeamProductOwnerAssigned,
            (team, event) => team.whenTeamProductOwnerAssigned(event)
        );
    }

    constructor(tenant: Tenant, productId: ProductId, teamId: TeamId) {
        super(Team.streamNameFor(tenant, teamId));
        this._tenant = tenant;
        this._productId = productId;
        this._teamId = teamId;
    }

    // Command methods

    async form(name: string): Promise<void> {
        if (this._name) {
            return;
        }

        if (!name?.trim()) {
            throw new Error('Team name cannot be empty');
        }

        await this.apply(TeamCreated.with(
            this._tenant,
            this._productId,
            this._teamId,
            name.trim()
        ));
    }

    async registerMember(
        memberType: MemberType,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string
    ): Promise<void> {
        if (!username?.trim()) {
            throw new Error('Username cannot be empty');
        }
        if (this._members.has(username.trim())) {
            throw new Error('Member already exists in team');
        }
        if (!firstName?.trim()) {
            throw new Error('First name cannot be empty');
        }
        if (!lastName?.trim()) {
            throw new Error('Last name cannot be empty');
        }
        if (!emailAddress?.trim()) {
            throw new Error('Email address cannot be empty');
        }

        await this.apply(TeamMemberRegistered.with(
            this._tenant,
            this._productId,
            this._teamId,
            username.trim(),
            memberType,
            firstName.trim(),
            lastName.trim(),
            emailAddress.trim()
        ));
    }

    async assignProductOwner(productOwner: ProductOwner): Promise<void> {
        if (this._productOwner?.username === productOwner.username) {
            return;
        }

        await this.apply(TeamProductOwnerAssigned.with(
            this._tenant,
            this._productId,
            this._teamId,
            productOwner.username
        ));
    }

    async changeMemberEmailAddress(username: string, emailAddress: string): Promise<void> {
        const member = this.memberOf(username);
        const event = member.changeEmailAddress(
            this._tenant, this._productId, this._teamId, emailAddress
        );
        if (event) {
            await this.apply(event);
        }
    }

    async changeMemberName(username: string, firstName: string, lastName: string): Promise<void> {
        const member = this.memberOf(username);
        const event = member.changeName(
            this._tenant, this._productId, this._teamId, firstName, lastName
        );
        if (event) {
            await this.apply(event);
        }
    }

    async enableMember(username: string): Promise<void> {
        const member = this.memberOf(username);
        const event = member.enable(this._tenant, this._productId, this._teamId);
        if (event) {
            await this.apply(event);
        }
    }

    async disableMember(username: string): Promise<void> {
        const member = this.memberOf(username);
        const event = member.disable(this._tenant, this._productId, this._teamId);
        if (event) {
            await this.apply(event);
        }
    }

    async removeMember(username: string): Promise<void> {
        const member = this.memberOf(username);

        await this.apply(TeamMemberRemoved.with(
            this._tenant,
            this._productId,
            this._teamId,
            username,
            member.memberType
        ));
    }

    // Private helpers

    private memberOf(username: string): Member {
        const member = this._members.get(username);
        if (!member) {
            throw new Error('Member not found in team');
        }
        return member;
    }

    // Event handlers (state mutators)

    private whenTeamCreated(event: TeamCreated): void {
        this._tenant = Tenant.of(event.tenantId);
        this._teamId = TeamId.of(event.teamId);
        this._name = event.name;
    }

    private whenTeamMemberRegistered(event: TeamMemberRegistered): void {
        const member = event.memberType === MemberType.ProductOwner
            ? new ProductOwner(event.tenantId, event.username, event.firstName, event.lastName, event.emailAddress)
            : new TeamMember(event.tenantId, event.username, event.firstName, event.lastName, event.emailAddress);
        this._members.set(event.username, member);
    }

    private whenTeamMemberEmailAddressChanged(event: TeamMemberEmailAddressChanged): void {
        this._members.get(event.memberId)?.applyEmailAddressChanged(event.emailAddress);
    }

    private whenTeamMemberNameChanged(event: TeamMemberNameChanged): void {
        this._members.get(event.memberId)?.applyNameChanged(event.firstName, event.lastName);
    }

    private whenTeamMemberEnabled(event: TeamMemberEnabled): void {
        this._members.get(event.memberId)?.applyEnabled();
    }

    private whenTeamMemberDisabled(event: TeamMemberDisabled): void {
        this._members.get(event.memberId)?.applyDisabled();
    }

    private whenTeamMemberRemoved(event: TeamMemberRemoved): void {
        this._members.delete(event.memberId);
    }

    private whenTeamProductOwnerAssigned(event: TeamProductOwnerAssigned): void {
        const member = this._members.get(event.username);
        if (member && member instanceof ProductOwner) {
            this._productOwner = member;
        }
    }
}
