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
import { DiscussionDescriptor } from './DiscussionDescriptor';

/**
 * Value object representing a BacklogItem's discussion.
 * Manages the state transitions for discussion requests.
 */
export class BacklogItemDiscussion {
    private constructor(
        private readonly _descriptor: DiscussionDescriptor
    ) {
        Object.freeze(this);
    }

    /**
     * Create a BacklogItemDiscussion from a descriptor.
     */
    static fromDescriptor(descriptor: DiscussionDescriptor): BacklogItemDiscussion {
        return new BacklogItemDiscussion(descriptor);
    }

    /**
     * Create a BacklogItemDiscussion that is not available.
     */
    static notAvailable(): BacklogItemDiscussion {
        return new BacklogItemDiscussion(DiscussionDescriptor.notAvailable());
    }

    /**
     * Reconstitute from stored values.
     */
    static fromState(discussionId: string, availability: DiscussionAvailability): BacklogItemDiscussion {
        return new BacklogItemDiscussion(DiscussionDescriptor.fromState(discussionId, availability));
    }

    get descriptor(): DiscussionDescriptor {
        return this._descriptor;
    }

    get availability(): DiscussionAvailability {
        return this._descriptor.availability;
    }

    get discussionId(): string {
        return this._descriptor.id;
    }

    get isReady(): boolean {
        return this._descriptor.isReady;
    }

    get isRequested(): boolean {
        return this._descriptor.isRequested;
    }

    get canRequest(): boolean {
        return this._descriptor.isNotAvailable;
    }

    /**
     * Request a discussion. Returns a new BacklogItemDiscussion in Requested state.
     * @throws Error if discussion is already requested or ready
     */
    requestDiscussion(): BacklogItemDiscussion {
        if (this._descriptor.isRequested) {
            throw new Error('Discussion already requested');
        }
        if (this._descriptor.isReady) {
            throw new Error('Discussion already ready');
        }
        return new BacklogItemDiscussion(DiscussionDescriptor.requested());
    }

    /**
     * Initialize the discussion with a discussion ID.
     * @throws Error if discussion was not requested
     */
    initiate(discussionId: string): BacklogItemDiscussion {
        if (!this._descriptor.isRequested) {
            throw new Error('Discussion must be requested before initiating');
        }
        return new BacklogItemDiscussion(DiscussionDescriptor.ready(discussionId));
    }

    /**
     * Mark the discussion request as failed.
     */
    failRequest(): BacklogItemDiscussion {
        if (!this._descriptor.isRequested) {
            throw new Error('Discussion must be requested before it can fail');
        }
        return new BacklogItemDiscussion(DiscussionDescriptor.failed());
    }

    equals(other: BacklogItemDiscussion): boolean {
        if (!other) return false;
        return this._descriptor.equals(other._descriptor);
    }

    toString(): string {
        return `BacklogItemDiscussion[${this._descriptor}]`;
    }
}
