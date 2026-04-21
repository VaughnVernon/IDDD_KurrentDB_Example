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

import { Member } from './Member';
import { MemberType } from './MemberType';
import { MemberChangeTracker } from './MemberChangeTracker';
import { ProductOwnerId } from './ProductOwnerId';

/**
 * A ProductOwner is a Member responsible for maximizing the value
 * of the product and managing the product backlog.
 * Embedded within the Team aggregate.
 */
export class ProductOwner extends Member {
    constructor(
        tenantId: string,
        username: string,
        firstName: string,
        lastName: string,
        emailAddress: string,
        changeTracker: MemberChangeTracker = MemberChangeTracker.create()
    ) {
        super(tenantId, username, firstName, lastName, emailAddress, changeTracker);
    }

    get memberType(): MemberType {
        return MemberType.ProductOwner;
    }

    productOwnerId(): ProductOwnerId {
        return ProductOwnerId.of(this.tenantId, this.username);
    }
}
