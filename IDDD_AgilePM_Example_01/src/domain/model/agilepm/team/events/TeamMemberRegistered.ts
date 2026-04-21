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

import { DomainEvent } from 'domo-tactical';
import type { Tenant } from '../../tenant/Tenant';
import type { ProductId } from '../../product/ProductId';
import type { TeamId } from '../TeamId';
import type { MemberType } from '../MemberType';

/**
 * Event emitted when a member (ProductOwner or TeamMember) is registered to a Team.
 */
export class TeamMemberRegistered extends DomainEvent {
    static with(
        tenant: Tenant,
        productId: ProductId,
        teamId: TeamId,
        username: string,
        memberType: MemberType,
        firstName: string,
        lastName: string,
        emailAddress: string
    ): TeamMemberRegistered {
        return new TeamMemberRegistered(tenant.id, productId.id, teamId.id, username, memberType, username, firstName, lastName, emailAddress);
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly teamId: string,
        public readonly memberId: string,
        public readonly memberType: string,
        public readonly username: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly emailAddress: string
    ) {
        super();
    }

    override id(): string {
        return this.teamId;
    }
}
