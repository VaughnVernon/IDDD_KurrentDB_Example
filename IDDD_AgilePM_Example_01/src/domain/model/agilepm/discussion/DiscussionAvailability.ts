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
 * Represents the availability status of a discussion.
 * Used to track the lifecycle of discussion requests.
 */
export enum DiscussionAvailability {
    /** Discussion has been added and is ready for use */
    Ready = 'Ready',

    /** Discussion has been requested but not yet available */
    Requested = 'Requested',

    /** Discussion is not available (initial state or failed) */
    NotAvailable = 'NotAvailable',

    /** Discussion request has failed permanently */
    Failed = 'Failed'
}

/**
 * Check if a discussion is usable (Ready state).
 */
export function isDiscussionReady(availability: DiscussionAvailability): boolean {
    return availability === DiscussionAvailability.Ready;
}

/**
 * Check if a discussion request is pending.
 */
export function isDiscussionRequested(availability: DiscussionAvailability): boolean {
    return availability === DiscussionAvailability.Requested;
}
