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

import { MemberChangeTracker } from './MemberChangeTracker';
import { MemberType } from './MemberType';
import type { Tenant } from '../tenant/Tenant';
import type { ProductId } from '../product/ProductId';
import type { TeamId } from './TeamId';
import {
    TeamMemberEmailAddressChanged,
    TeamMemberNameChanged,
    TeamMemberEnabled,
    TeamMemberDisabled
} from './events';

/**
 * Abstract base class for team members (ProductOwner and TeamMember).
 * Contains common member information, change tracking, and behavior.
 *
 * Identity is (tenantId, username) — the username IS the member identity,
 * matching the Java IDDD reference. No UUIDs.
 *
 * Change methods return events (or undefined for no-ops) so that the
 * Team aggregate can apply them.
 */
export abstract class Member {
    private _tenantId: string;
    private _username: string;
    private _firstName: string;
    private _lastName: string;
    private _emailAddress: string;
    private _changeTracker: MemberChangeTracker;

    protected constructor(
        tenantId: string,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string,
        changeTracker: MemberChangeTracker
    ) {
        this._tenantId = tenantId;
        this._username = username;
        this._firstName = firstName;
        this._lastName = lastName;
        this._emailAddress = emailAddress;
        this._changeTracker = changeTracker;
    }

    abstract get memberType(): MemberType;

    get tenantId(): string {
        return this._tenantId;
    }

    get username(): string {
        return this._username;
    }

    get firstName(): string {
        return this._firstName;
    }

    get lastName(): string {
        return this._lastName;
    }

    get fullName(): string {
        return `${this._firstName} ${this._lastName}`;
    }

    get emailAddress(): string {
        return this._emailAddress;
    }

    get changeTracker(): MemberChangeTracker {
        return this._changeTracker;
    }

    get isEnabled(): boolean {
        return this._changeTracker.isEnabled;
    }

    changeEmailAddress(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId,
        emailAddress: string
    ): TeamMemberEmailAddressChanged | undefined {
        if (!emailAddress?.trim()) {
            throw new Error('Email address cannot be empty');
        }
        if (this._emailAddress === emailAddress.trim()) {
            return undefined;
        }
        return TeamMemberEmailAddressChanged.with(
            tenant,
            productId,
            teamId,
            this._username,
            this.memberType,
            emailAddress.trim()
        );
    }

    changeName(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId,
        firstName: string,
        lastName: string
    ): TeamMemberNameChanged | undefined {
        if (!firstName?.trim()) {
            throw new Error('First name cannot be empty');
        }
        if (!lastName?.trim()) {
            throw new Error('Last name cannot be empty');
        }
        if (this._firstName === firstName.trim() && this._lastName === lastName.trim()) {
            return undefined;
        }
        return TeamMemberNameChanged.with(
            tenant,
            productId,
            teamId,
            this._username,
            this.memberType,
            firstName.trim(),
            lastName.trim()
        );
    }

    enable(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId
    ): TeamMemberEnabled | undefined {
        if (this._changeTracker.isEnabled) {
            return undefined;
        }
        return TeamMemberEnabled.with(
            tenant,
            productId,
            teamId,
            this._username,
            this.memberType
        );
    }

    disable(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId
    ): TeamMemberDisabled | undefined {
        if (!this._changeTracker.isEnabled) {
            return undefined;
        }
        return TeamMemberDisabled.with(
            tenant,
            productId,
            teamId,
            this._username,
            this.memberType
        );
    }

    // Internal mutation methods called by Team's event handlers

    applyEmailAddressChanged(emailAddress: string): void {
        this._emailAddress = emailAddress;
        this._changeTracker = this._changeTracker.emailAddressChanged();
    }

    applyNameChanged(firstName: string, lastName: string): void {
        this._firstName = firstName;
        this._lastName = lastName;
        this._changeTracker = this._changeTracker.nameChanged();
    }

    applyEnabled(): void {
        this._changeTracker = this._changeTracker.enabled();
    }

    applyDisabled(): void {
        this._changeTracker = this._changeTracker.disabled();
    }

    equals(other: Member): boolean {
        if (!other) return false;
        return this._tenantId === other._tenantId && this._username === other._username;
    }

    toString(): string {
        return `${this.memberType}[username=${this._username}, name=${this.fullName}, enabled=${this.isEnabled}]`;
    }
}
