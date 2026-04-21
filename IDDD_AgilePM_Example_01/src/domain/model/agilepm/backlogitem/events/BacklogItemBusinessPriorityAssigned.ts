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

import { Source } from 'domo-tactical';
import type { Tenant } from '../../tenant/Tenant';
import type { ProductId } from '../../product/ProductId';
import type { BacklogItemId } from '../BacklogItemId';
import type { BusinessPriority } from '../BusinessPriority';

/**
 * Event raised when business priority ratings are assigned to a BacklogItem.
 */
export class BacklogItemBusinessPriorityAssigned extends Source<BacklogItemBusinessPriorityAssigned> {
    static readonly TYPE_NAME = 'BacklogItemBusinessPriorityAssigned';

    static with(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId,
        businessPriority: BusinessPriority
    ): BacklogItemBusinessPriorityAssigned {
        return new BacklogItemBusinessPriorityAssigned(
            tenant.id, productId.id, backlogItemId.id,
            businessPriority.ratings.benefit, businessPriority.ratings.penalty,
            businessPriority.ratings.cost, businessPriority.ratings.risk
        );
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly backlogItemId: string,
        public readonly benefit: number,
        public readonly penalty: number,
        public readonly cost: number,
        public readonly risk: number
    ) {
        super(BacklogItemBusinessPriorityAssigned);
    }

    override typeName(): string {
        return BacklogItemBusinessPriorityAssigned.TYPE_NAME;
    }
}
