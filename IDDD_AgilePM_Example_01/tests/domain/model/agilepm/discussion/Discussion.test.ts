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

import { describe, it, expect } from 'vitest';
import {
    DiscussionAvailability,
    isDiscussionReady,
    isDiscussionRequested,
    DiscussionDescriptor,
    ProductDiscussion,
    BacklogItemDiscussion
} from '../../../../../src/domain/model/agilepm/discussion';

describe('DiscussionAvailability', () => {
    it('should have correct enum values', () => {
        expect(DiscussionAvailability.Ready).toBe('Ready');
        expect(DiscussionAvailability.Requested).toBe('Requested');
        expect(DiscussionAvailability.NotAvailable).toBe('NotAvailable');
        expect(DiscussionAvailability.Failed).toBe('Failed');
    });

    it('should check if discussion is ready', () => {
        expect(isDiscussionReady(DiscussionAvailability.Ready)).toBe(true);
        expect(isDiscussionReady(DiscussionAvailability.Requested)).toBe(false);
        expect(isDiscussionReady(DiscussionAvailability.NotAvailable)).toBe(false);
        expect(isDiscussionReady(DiscussionAvailability.Failed)).toBe(false);
    });

    it('should check if discussion is requested', () => {
        expect(isDiscussionRequested(DiscussionAvailability.Requested)).toBe(true);
        expect(isDiscussionRequested(DiscussionAvailability.Ready)).toBe(false);
        expect(isDiscussionRequested(DiscussionAvailability.NotAvailable)).toBe(false);
        expect(isDiscussionRequested(DiscussionAvailability.Failed)).toBe(false);
    });
});

describe('DiscussionDescriptor', () => {
    describe('factory methods', () => {
        it('should create not available descriptor', () => {
            const descriptor = DiscussionDescriptor.notAvailable();

            expect(descriptor.availability).toBe(DiscussionAvailability.NotAvailable);
            expect(descriptor.isNotAvailable).toBe(true);
            expect(descriptor.isUndefined).toBe(true);
        });

        it('should create requested descriptor', () => {
            const descriptor = DiscussionDescriptor.requested();

            expect(descriptor.availability).toBe(DiscussionAvailability.Requested);
            expect(descriptor.isRequested).toBe(true);
            expect(descriptor.isUndefined).toBe(true);
        });

        it('should create ready descriptor with ID', () => {
            const descriptor = DiscussionDescriptor.ready('disc-123');

            expect(descriptor.availability).toBe(DiscussionAvailability.Ready);
            expect(descriptor.isReady).toBe(true);
            expect(descriptor.id).toBe('disc-123');
            expect(descriptor.isUndefined).toBe(false);
        });

        it('should throw error when creating ready descriptor with empty ID', () => {
            expect(() => DiscussionDescriptor.ready('')).toThrow('Discussion ID cannot be empty');
            expect(() => DiscussionDescriptor.ready('  ')).toThrow('Discussion ID cannot be empty');
        });

        it('should create failed descriptor', () => {
            const descriptor = DiscussionDescriptor.failed();

            expect(descriptor.availability).toBe(DiscussionAvailability.Failed);
            expect(descriptor.isFailed).toBe(true);
            expect(descriptor.isUndefined).toBe(true);
        });

        it('should reconstitute from state', () => {
            const descriptor = DiscussionDescriptor.fromState('disc-456', DiscussionAvailability.Ready);

            expect(descriptor.id).toBe('disc-456');
            expect(descriptor.availability).toBe(DiscussionAvailability.Ready);
        });
    });

    describe('equality', () => {
        it('should be equal when id and availability match', () => {
            const d1 = DiscussionDescriptor.ready('disc-123');
            const d2 = DiscussionDescriptor.ready('disc-123');

            expect(d1.equals(d2)).toBe(true);
        });

        it('should not be equal when id differs', () => {
            const d1 = DiscussionDescriptor.ready('disc-123');
            const d2 = DiscussionDescriptor.ready('disc-456');

            expect(d1.equals(d2)).toBe(false);
        });

        it('should not be equal when availability differs', () => {
            const d1 = DiscussionDescriptor.notAvailable();
            const d2 = DiscussionDescriptor.requested();

            expect(d1.equals(d2)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return string representation', () => {
            const descriptor = DiscussionDescriptor.ready('disc-123');
            expect(descriptor.toString()).toContain('disc-123');
            expect(descriptor.toString()).toContain('Ready');
        });
    });
});

describe('ProductDiscussion', () => {
    describe('creation', () => {
        it('should create not available discussion', () => {
            const discussion = ProductDiscussion.notAvailable();

            expect(discussion.availability).toBe(DiscussionAvailability.NotAvailable);
            expect(discussion.canRequest).toBe(true);
            expect(discussion.isReady).toBe(false);
            expect(discussion.isRequested).toBe(false);
        });

        it('should create from descriptor', () => {
            const descriptor = DiscussionDescriptor.ready('disc-123');
            const discussion = ProductDiscussion.fromDescriptor(descriptor);

            expect(discussion.discussionId).toBe('disc-123');
            expect(discussion.isReady).toBe(true);
        });

        it('should reconstitute from state', () => {
            const discussion = ProductDiscussion.fromState('disc-789', DiscussionAvailability.Ready);

            expect(discussion.discussionId).toBe('disc-789');
            expect(discussion.availability).toBe(DiscussionAvailability.Ready);
        });
    });

    describe('requestDiscussion', () => {
        it('should request discussion when not available', () => {
            const discussion = ProductDiscussion.notAvailable();
            const requested = discussion.requestDiscussion();

            expect(requested.isRequested).toBe(true);
            expect(requested.canRequest).toBe(false);
        });

        it('should throw error when already requested', () => {
            const discussion = ProductDiscussion.notAvailable().requestDiscussion();

            expect(() => discussion.requestDiscussion()).toThrow('Discussion already requested');
        });

        it('should throw error when already ready', () => {
            const discussion = ProductDiscussion.fromDescriptor(DiscussionDescriptor.ready('disc-123'));

            expect(() => discussion.requestDiscussion()).toThrow('Discussion already ready');
        });
    });

    describe('initiate', () => {
        it('should initiate discussion with ID', () => {
            const discussion = ProductDiscussion.notAvailable()
                .requestDiscussion()
                .initiate('disc-123');

            expect(discussion.isReady).toBe(true);
            expect(discussion.discussionId).toBe('disc-123');
        });

        it('should throw error when not requested', () => {
            const discussion = ProductDiscussion.notAvailable();

            expect(() => discussion.initiate('disc-123')).toThrow('Discussion must be requested before initiating');
        });
    });

    describe('failRequest', () => {
        it('should mark request as failed', () => {
            const discussion = ProductDiscussion.notAvailable()
                .requestDiscussion()
                .failRequest();

            expect(discussion.descriptor.isFailed).toBe(true);
        });

        it('should throw error when not requested', () => {
            const discussion = ProductDiscussion.notAvailable();

            expect(() => discussion.failRequest()).toThrow('Discussion must be requested before it can fail');
        });
    });

    describe('equality', () => {
        it('should be equal when descriptors match', () => {
            const d1 = ProductDiscussion.notAvailable();
            const d2 = ProductDiscussion.notAvailable();

            expect(d1.equals(d2)).toBe(true);
        });

        it('should not be equal when descriptors differ', () => {
            const d1 = ProductDiscussion.notAvailable();
            const d2 = ProductDiscussion.notAvailable().requestDiscussion();

            expect(d1.equals(d2)).toBe(false);
        });
    });
});

describe('BacklogItemDiscussion', () => {
    describe('creation', () => {
        it('should create not available discussion', () => {
            const discussion = BacklogItemDiscussion.notAvailable();

            expect(discussion.availability).toBe(DiscussionAvailability.NotAvailable);
            expect(discussion.canRequest).toBe(true);
        });

        it('should create from descriptor', () => {
            const descriptor = DiscussionDescriptor.ready('disc-123');
            const discussion = BacklogItemDiscussion.fromDescriptor(descriptor);

            expect(discussion.discussionId).toBe('disc-123');
            expect(discussion.isReady).toBe(true);
        });

        it('should reconstitute from state', () => {
            const discussion = BacklogItemDiscussion.fromState('disc-789', DiscussionAvailability.Ready);

            expect(discussion.discussionId).toBe('disc-789');
            expect(discussion.availability).toBe(DiscussionAvailability.Ready);
        });
    });

    describe('requestDiscussion', () => {
        it('should request discussion when not available', () => {
            const discussion = BacklogItemDiscussion.notAvailable();
            const requested = discussion.requestDiscussion();

            expect(requested.isRequested).toBe(true);
        });

        it('should throw error when already requested', () => {
            const discussion = BacklogItemDiscussion.notAvailable().requestDiscussion();

            expect(() => discussion.requestDiscussion()).toThrow('Discussion already requested');
        });
    });

    describe('initiate', () => {
        it('should initiate discussion with ID', () => {
            const discussion = BacklogItemDiscussion.notAvailable()
                .requestDiscussion()
                .initiate('disc-456');

            expect(discussion.isReady).toBe(true);
            expect(discussion.discussionId).toBe('disc-456');
        });

        it('should throw error when not requested', () => {
            const discussion = BacklogItemDiscussion.notAvailable();

            expect(() => discussion.initiate('disc-456')).toThrow('Discussion must be requested before initiating');
        });
    });

    describe('failRequest', () => {
        it('should mark request as failed', () => {
            const discussion = BacklogItemDiscussion.notAvailable()
                .requestDiscussion()
                .failRequest();

            expect(discussion.descriptor.isFailed).toBe(true);
        });
    });

    describe('equality', () => {
        it('should be equal when descriptors match', () => {
            const d1 = BacklogItemDiscussion.notAvailable();
            const d2 = BacklogItemDiscussion.notAvailable();

            expect(d1.equals(d2)).toBe(true);
        });
    });
});
