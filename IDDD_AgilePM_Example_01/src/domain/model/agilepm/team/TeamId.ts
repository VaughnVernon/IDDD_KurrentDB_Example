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

import { v4 } from 'uuid';

/**
 * Value object representing a unique team identifier.
 */
export class TeamId {
    private readonly _id: string;

    private constructor(id: string) {
        if (!id?.trim()) {
            throw new Error('TeamId cannot be empty');
        }
        this._id = id;
    }

    static unique(): TeamId {
        return new TeamId(v4());
    }

    static of(id: string): TeamId {
        return new TeamId(id);
    }

    get id(): string {
        return this._id;
    }

    equals(other: TeamId): boolean {
        if (!other) return false;
        return this._id === other._id;
    }

    toString(): string {
        return this._id;
    }
}
