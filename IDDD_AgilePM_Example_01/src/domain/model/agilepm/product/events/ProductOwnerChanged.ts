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
import type { ProductId } from '../ProductId';
import type { ProductOwnerId } from '../../team/ProductOwnerId';

/**
 * Event emitted when a Product's owner is changed.
 */
export class ProductOwnerChanged extends DomainEvent {
    static with(
        tenant: Tenant,
        productId: ProductId,
        productOwnerId: ProductOwnerId
    ): ProductOwnerChanged {
        return new ProductOwnerChanged(tenant.id, productId.id, productOwnerId.toString());
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly productOwnerId: string
    ) {
        super();
    }

    override id(): string {
        return this.productId;
    }
}
