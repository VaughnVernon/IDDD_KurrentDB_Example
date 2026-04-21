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

/**
 * Event raised when a discussion is requested for a BacklogItem.
 */
export class BacklogItemDiscussionRequested extends Source<BacklogItemDiscussionRequested> {
    static readonly TYPE_NAME = 'BacklogItemDiscussionRequested';

    static with(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId,
        requestedOn: Date
    ): BacklogItemDiscussionRequested {
        return new BacklogItemDiscussionRequested(tenant.id, productId.id, backlogItemId.id, requestedOn);
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly backlogItemId: string,
        public readonly requestedOn: Date
    ) {
        super(BacklogItemDiscussionRequested);
    }

    override typeName(): string {
        return BacklogItemDiscussionRequested.TYPE_NAME;
    }
}
