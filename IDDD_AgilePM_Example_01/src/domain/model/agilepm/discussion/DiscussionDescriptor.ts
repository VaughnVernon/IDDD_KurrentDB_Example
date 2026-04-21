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

import { DiscussionAvailability } from './DiscussionAvailability';

/**
 * A descriptor that links to a discussion in the Collaboration bounded context.
 * This is an immutable value object.
 */
export class DiscussionDescriptor {
    private static readonly UNDEFINED_ID = 'UNDEFINED';

    private constructor(
        private readonly _id: string,
        private readonly _availability: DiscussionAvailability
    ) {
        Object.freeze(this);
    }

    /**
     * Create a descriptor for a discussion that is not available.
     */
    static notAvailable(): DiscussionDescriptor {
        return new DiscussionDescriptor(
            DiscussionDescriptor.UNDEFINED_ID,
            DiscussionAvailability.NotAvailable
        );
    }

    /**
     * Create a descriptor for a requested discussion.
     */
    static requested(): DiscussionDescriptor {
        return new DiscussionDescriptor(
            DiscussionDescriptor.UNDEFINED_ID,
            DiscussionAvailability.Requested
        );
    }

    /**
     * Create a descriptor for a ready discussion with an ID.
     */
    static ready(discussionId: string): DiscussionDescriptor {
        if (!discussionId?.trim()) {
            throw new Error('Discussion ID cannot be empty');
        }
        return new DiscussionDescriptor(
            discussionId.trim(),
            DiscussionAvailability.Ready
        );
    }

    /**
     * Create a descriptor for a failed discussion request.
     */
    static failed(): DiscussionDescriptor {
        return new DiscussionDescriptor(
            DiscussionDescriptor.UNDEFINED_ID,
            DiscussionAvailability.Failed
        );
    }

    /**
     * Reconstitute from stored values.
     */
    static fromState(id: string, availability: DiscussionAvailability): DiscussionDescriptor {
        return new DiscussionDescriptor(id, availability);
    }

    get id(): string {
        return this._id;
    }

    get availability(): DiscussionAvailability {
        return this._availability;
    }

    get isReady(): boolean {
        return this._availability === DiscussionAvailability.Ready;
    }

    get isRequested(): boolean {
        return this._availability === DiscussionAvailability.Requested;
    }

    get isNotAvailable(): boolean {
        return this._availability === DiscussionAvailability.NotAvailable;
    }

    get isFailed(): boolean {
        return this._availability === DiscussionAvailability.Failed;
    }

    get isUndefined(): boolean {
        return this._id === DiscussionDescriptor.UNDEFINED_ID;
    }

    equals(other: DiscussionDescriptor): boolean {
        if (!other) return false;
        return this._id === other._id && this._availability === other._availability;
    }

    toString(): string {
        return `DiscussionDescriptor[id=${this._id}, availability=${this._availability}]`;
    }
}
