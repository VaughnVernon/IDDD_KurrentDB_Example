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
 * Event raised when a discussion is attached to a BacklogItem.
 */
export class BacklogItemDiscussionAttached extends Source<BacklogItemDiscussionAttached> {
    static readonly TYPE_NAME = 'BacklogItemDiscussionAttached';

    static with(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId,
        discussionId: string
    ): BacklogItemDiscussionAttached {
        return new BacklogItemDiscussionAttached(tenant.id, productId.id, backlogItemId.id, discussionId);
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly backlogItemId: string,
        public readonly discussionId: string
    ) {
        super(BacklogItemDiscussionAttached);
    }

    override typeName(): string {
        return BacklogItemDiscussionAttached.TYPE_NAME;
    }
}
