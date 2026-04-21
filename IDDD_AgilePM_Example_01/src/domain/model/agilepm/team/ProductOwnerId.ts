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

/**
 * Identity for a ProductOwner, scoped by tenant.
 * The id is the username — the username IS the identity, matching the Java IDDD reference.
 */
export class ProductOwnerId {
    private constructor(
        private readonly _tenantId: string,
        private readonly _id: string
    ) {
        if (!_tenantId?.trim()) {
            throw new Error('Tenant ID cannot be empty');
        }
        if (!_id?.trim()) {
            throw new Error('ProductOwner ID cannot be empty');
        }
        Object.freeze(this);
    }

    static of(tenantId: string, id: string): ProductOwnerId {
        return new ProductOwnerId(tenantId, id);
    }

    static from(value: string): ProductOwnerId {
        const sep = value.indexOf(':');
        if (sep < 0) {
            throw new Error(`Invalid ProductOwnerId format: ${value}`);
        }
        return new ProductOwnerId(value.substring(0, sep), value.substring(sep + 1));
    }

    get tenantId(): string {
        return this._tenantId;
    }

    get id(): string {
        return this._id;
    }

    equals(other: ProductOwnerId): boolean {
        if (!other) return false;
        return this._tenantId === other._tenantId && this._id === other._id;
    }

    toString(): string {
        return `${this._tenantId}:${this._id}`;
    }
}
