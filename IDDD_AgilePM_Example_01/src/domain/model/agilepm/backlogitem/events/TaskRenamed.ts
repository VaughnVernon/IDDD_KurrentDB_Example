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
import type { TaskId } from '../TaskId';

/**
 * Event raised when a Task is renamed.
 */
export class TaskRenamed extends Source<TaskRenamed> {
    static readonly TYPE_NAME = 'TaskRenamed';

    static with(
        tenant: Tenant,
        productId: ProductId,
        backlogItemId: BacklogItemId,
        taskId: TaskId,
        name: string
    ): TaskRenamed {
        return new TaskRenamed(tenant.id, productId.id, backlogItemId.id, taskId.id, name);
    }

    constructor(
        public readonly tenantId: string,
        public readonly productId: string,
        public readonly backlogItemId: string,
        public readonly taskId: string,
        public readonly name: string
    ) {
        super(TaskRenamed);
    }

    override typeName(): string {
        return TaskRenamed.TYPE_NAME;
    }
}
