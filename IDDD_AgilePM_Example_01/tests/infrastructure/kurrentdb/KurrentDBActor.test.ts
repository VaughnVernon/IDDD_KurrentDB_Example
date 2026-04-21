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

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { stage, Stage } from 'domo-actors';
import {
    kurrentInstance,
    type KurrentDB,
    type KurrentEventData
} from '../../../src/infrastructure/kurrentdb';
import { v4 as uuid } from 'uuid';

/**
 * KurrentDBActor integration tests.
 *
 * These tests require a running KurrentDB instance.
 *
 * To run:
 * 1. Start KurrentDB: docker compose up -d
 * 2. Set environment variable: TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false
 * 3. Run tests: npm test -- tests/infrastructure/kurrentdb/KurrentDBActor.test.ts
 */
describe('KurrentDBActor', () => {
    let kurrentDB: KurrentDB;
    let testStage: Stage;
    let connectionString: string | undefined;

    beforeAll(async () => {
        connectionString = process.env.TEST_KURRENTDB_URL;

        if (!connectionString) {
            console.log('Skipping KurrentDB tests - TEST_KURRENTDB_URL not set');
            console.log('To run: docker compose up -d && TEST_KURRENTDB_URL=esdb://localhost:2113?tls=false npm test');
            return;
        }

        testStage = stage();
        kurrentDB = kurrentInstance(connectionString);
    });

    afterAll(async () => {
        if (testStage) {
            await testStage.close();
        }
    });

    describe('appendToStream', () => {
        it('should append a single event to a new stream', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const event: KurrentEventData<{ name: string; value: number }> = {
                id: uuid(),
                type: 'TestEvent',
                data: { name: 'test', value: 42 }
            };

            const result = await kurrentDB.appendToStream(streamName, event, {
                expectedRevision: 'no_stream'
            });

            expect(result.success).toBe(true);
            expect(result.nextExpectedRevision).toBe(0n);
        });

        it('should append multiple events to a stream', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'TestEvent', data: { index: 1 } },
                { id: uuid(), type: 'TestEvent', data: { index: 2 } },
                { id: uuid(), type: 'TestEvent', data: { index: 3 } }
            ];

            const result = await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            expect(result.success).toBe(true);
            expect(result.nextExpectedRevision).toBe(2n);
        });

        it('should append with expectedRevision "any"', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const event1: KurrentEventData = {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 1 }
            };
            const event2: KurrentEventData = {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 2 }
            };

            // Append to new stream with 'any'
            const result1 = await kurrentDB.appendToStream(streamName, event1, {
                expectedRevision: 'any'
            });
            expect(result1.success).toBe(true);

            // Append to existing stream with 'any'
            const result2 = await kurrentDB.appendToStream(streamName, event2, {
                expectedRevision: 'any'
            });
            expect(result2.success).toBe(true);
            expect(result2.nextExpectedRevision).toBe(1n);
        });

        it('should fail with wrong expected revision', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;

            // First append
            await kurrentDB.appendToStream(streamName, {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 1 }
            }, {
                expectedRevision: 'no_stream'
            });

            // Try to append with wrong revision (expecting no_stream but stream exists)
            // Use a different event ID to avoid idempotency
            const result = await kurrentDB.appendToStream(streamName, {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 2 }
            }, {
                expectedRevision: 'no_stream'
            });

            expect(result.success).toBe(false);
        });

        it('should append with specific expected revision', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const event1: KurrentEventData = {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 1 }
            };
            const event2: KurrentEventData = {
                id: uuid(),
                type: 'TestEvent',
                data: { step: 2 }
            };

            // Create stream
            await kurrentDB.appendToStream(streamName, event1, {
                expectedRevision: 'no_stream'
            });

            // Append with expected revision 0 (first event)
            const result = await kurrentDB.appendToStream(streamName, event2, {
                expectedRevision: 0n
            });

            expect(result.success).toBe(true);
            expect(result.nextExpectedRevision).toBe(1n);
        });

        it('should append with stream_exists expectation', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const event1: KurrentEventData = { id: uuid(), type: 'TestEvent', data: { step: 1 } };
            const event2: KurrentEventData = { id: uuid(), type: 'TestEvent', data: { step: 2 } };

            // stream_exists on non-existent should fail
            const result1 = await kurrentDB.appendToStream(streamName, event1, {
                expectedRevision: 'stream_exists'
            });
            expect(result1.success).toBe(false);

            // Create stream
            await kurrentDB.appendToStream(streamName, event1, {
                expectedRevision: 'no_stream'
            });

            // stream_exists on existing stream should succeed
            const result2 = await kurrentDB.appendToStream(streamName, event2, {
                expectedRevision: 'stream_exists'
            });
            expect(result2.success).toBe(true);
        });

        it('should include event metadata', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const event: KurrentEventData = {
                id: uuid(),
                type: 'TestEvent',
                data: { value: 123 },
                metadata: {
                    correlationId: 'corr-123',
                    causationId: 'cause-456'
                }
            };

            const result = await kurrentDB.appendToStream(streamName, event, {
                expectedRevision: 'no_stream'
            });

            expect(result.success).toBe(true);

            // Read back and verify metadata
            const events = await kurrentDB.readStream(streamName);
            expect(events.length).toBe(1);
            expect(events[0].metadata).toBeDefined();
            expect(events[0].metadata?.correlationId).toBe('corr-123');
            expect(events[0].metadata?.causationId).toBe('cause-456');
        });
    });

    describe('readStream', () => {
        it('should read all events from a stream', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'EventA', data: { index: 1 } },
                { id: uuid(), type: 'EventB', data: { index: 2 } },
                { id: uuid(), type: 'EventC', data: { index: 3 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            const readEvents = await kurrentDB.readStream<{ index: number }>(streamName);

            expect(readEvents.length).toBe(3);
            expect(readEvents[0].type).toBe('EventA');
            expect(readEvents[0].data.index).toBe(1);
            expect(readEvents[0].revision).toBe(0n);
            expect(readEvents[1].type).toBe('EventB');
            expect(readEvents[1].data.index).toBe(2);
            expect(readEvents[1].revision).toBe(1n);
            expect(readEvents[2].type).toBe('EventC');
            expect(readEvents[2].data.index).toBe(3);
            expect(readEvents[2].revision).toBe(2n);
        });

        it('should read events forwards from start', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'TestEvent', data: { index: 1 } },
                { id: uuid(), type: 'TestEvent', data: { index: 2 } },
                { id: uuid(), type: 'TestEvent', data: { index: 3 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            const readEvents = await kurrentDB.readStream<{ index: number }>(streamName, {
                direction: 'forwards',
                fromRevision: 'start'
            });

            expect(readEvents.length).toBe(3);
            expect(readEvents[0].data.index).toBe(1);
            expect(readEvents[2].data.index).toBe(3);
        });

        it('should read events backwards from end', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'TestEvent', data: { index: 1 } },
                { id: uuid(), type: 'TestEvent', data: { index: 2 } },
                { id: uuid(), type: 'TestEvent', data: { index: 3 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            const readEvents = await kurrentDB.readStream<{ index: number }>(streamName, {
                direction: 'backwards',
                fromRevision: 'end'
            });

            expect(readEvents.length).toBe(3);
            expect(readEvents[0].data.index).toBe(3); // Last event first
            expect(readEvents[2].data.index).toBe(1); // First event last
        });

        it('should read with maxCount limit', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = Array.from({ length: 10 }, (_, i) => ({
                id: uuid(),
                type: 'TestEvent',
                data: { index: i + 1 }
            }));

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            const readEvents = await kurrentDB.readStream<{ index: number }>(streamName, {
                maxCount: 3n
            });

            expect(readEvents.length).toBe(3);
            expect(readEvents[0].data.index).toBe(1);
            expect(readEvents[2].data.index).toBe(3);
        });

        it('should read from specific revision', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'TestEvent', data: { index: 1 } },
                { id: uuid(), type: 'TestEvent', data: { index: 2 } },
                { id: uuid(), type: 'TestEvent', data: { index: 3 } },
                { id: uuid(), type: 'TestEvent', data: { index: 4 } },
                { id: uuid(), type: 'TestEvent', data: { index: 5 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            // Read from revision 2 (third event)
            const readEvents = await kurrentDB.readStream<{ index: number }>(streamName, {
                fromRevision: 2n
            });

            expect(readEvents.length).toBe(3);
            expect(readEvents[0].data.index).toBe(3);
            expect(readEvents[0].revision).toBe(2n);
        });

        it('should return empty array for non-existent stream', async () => {
            if (!connectionString) return;

            const streamName = `nonexistent-stream-${Date.now()}-${uuid().slice(0, 8)}`;

            try {
                const readEvents = await kurrentDB.readStream(streamName);
                expect(readEvents.length).toBe(0);
            } catch (error: any) {
                // Stream not found is also acceptable
                expect(error.type).toBe('stream-not-found');
            }
        });

        it('should include stream and event information', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const eventId = uuid();
            const event: KurrentEventData = {
                id: eventId,
                type: 'DetailedEvent',
                data: { detail: 'test' }
            };

            await kurrentDB.appendToStream(streamName, event, {
                expectedRevision: 'no_stream'
            });

            const readEvents = await kurrentDB.readStream(streamName);

            expect(readEvents.length).toBe(1);
            expect(readEvents[0].streamId).toBe(streamName);
            expect(readEvents[0].id).toBe(eventId);
            expect(readEvents[0].type).toBe('DetailedEvent');
            expect(readEvents[0].revision).toBe(0n);
            expect(readEvents[0].created).toBeInstanceOf(Date);
        });
    });

    describe('getStreamRevision', () => {
        it('should return -1n for non-existent stream', async () => {
            if (!connectionString) return;

            const streamName = `nonexistent-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const revision = await kurrentDB.getStreamRevision(streamName);

            expect(revision).toBe(-1n);
        });

        it('should return current revision for existing stream', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;
            const events: KurrentEventData[] = [
                { id: uuid(), type: 'TestEvent', data: { step: 1 } },
                { id: uuid(), type: 'TestEvent', data: { step: 2 } },
                { id: uuid(), type: 'TestEvent', data: { step: 3 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            const revision = await kurrentDB.getStreamRevision(streamName);

            expect(revision).toBe(2n); // 0-based, so 3 events = revision 2
        });
    });

    describe('subscribeToStream', () => {
        it('should subscribe to stream events', async () => {
            if (!connectionString) return;

            const streamName = `test-stream-${Date.now()}-${uuid().slice(0, 8)}`;

            // Create some initial events
            const events: KurrentEventData<{ index: number }>[] = [
                { id: uuid(), type: 'TestEvent', data: { index: 1 } },
                { id: uuid(), type: 'TestEvent', data: { index: 2 } }
            ];

            await kurrentDB.appendToStream(streamName, events, {
                expectedRevision: 'no_stream'
            });

            // Subscribe from start (catch-up subscription)
            const subscription = await kurrentDB.subscribeToStream<{ index: number }>(streamName, 'start');

            const receivedEvents: { index: number }[] = [];

            // Use Promise.race with a timeout
            const readPromise = (async () => {
                for await (const event of subscription) {
                    receivedEvents.push(event.data);
                    if (receivedEvents.length >= 2) {
                        break;
                    }
                }
            })();

            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('Subscription timeout')), 5000);
            });

            try {
                await Promise.race([readPromise, timeoutPromise]);
            } catch (error) {
                // Timeout is acceptable if we got some events
            } finally {
                await subscription.unsubscribe();
            }

            expect(receivedEvents.length).toBe(2);
            expect(receivedEvents[0].index).toBe(1);
            expect(receivedEvents[1].index).toBe(2);
        });
    });

    describe('subscribeToAll', () => {
        it('should subscribe to all events with filter', async () => {
            if (!connectionString) return;

            const streamPrefix = `subscribe-all-${Date.now()}`;
            const streamA = `${streamPrefix}-a`;
            const streamB = `${streamPrefix}-b`;

            // Create events in multiple streams
            await kurrentDB.appendToStream(streamA, {
                id: uuid(),
                type: 'TestEvent',
                data: { stream: 'a' }
            }, { expectedRevision: 'no_stream' });

            await kurrentDB.appendToStream(streamB, {
                id: uuid(),
                type: 'TestEvent',
                data: { stream: 'b' }
            }, { expectedRevision: 'no_stream' });

            // Subscribe to all with stream name filter
            const subscription = await kurrentDB.subscribeToAll({
                fromPosition: 'start',
                filter: {
                    filterOn: 'stream_name',
                    prefixes: [streamPrefix]
                }
            });

            const receivedEvents: string[] = [];

            // Use Promise.race with a timeout
            const readPromise = (async () => {
                for await (const event of subscription) {
                    receivedEvents.push(event.streamId);
                    if (receivedEvents.length >= 2) {
                        break;
                    }
                }
            })();

            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error('Subscription timeout')), 5000);
            });

            try {
                await Promise.race([readPromise, timeoutPromise]);
            } catch (error) {
                // Timeout is acceptable if we got some events
            } finally {
                await subscription.unsubscribe();
            }

            expect(receivedEvents.length).toBe(2);
            expect(receivedEvents).toContain(streamA);
            expect(receivedEvents).toContain(streamB);
        });
    });

    describe('deleteStream', () => {
        it('should soft delete a stream', async () => {
            if (!connectionString) return;

            const streamName = `delete-test-${Date.now()}-${uuid().slice(0, 8)}`;

            // Create stream
            await kurrentDB.appendToStream(streamName, {
                id: uuid(),
                type: 'TestEvent',
                data: {}
            }, { expectedRevision: 'no_stream' });

            // Delete stream
            await kurrentDB.deleteStream(streamName);

            // Stream should be soft-deleted (can be recreated)
            const revision = await kurrentDB.getStreamRevision(streamName);
            expect(revision).toBe(-1n);
        });
    });

    describe('tombstoneStream', () => {
        it('should tombstone a stream', async () => {
            if (!connectionString) return;

            const streamName = `tombstone-test-${Date.now()}-${uuid().slice(0, 8)}`;

            // Create stream
            await kurrentDB.appendToStream(streamName, {
                id: uuid(),
                type: 'TestEvent',
                data: {}
            }, { expectedRevision: 'no_stream' });

            // Tombstone stream
            await kurrentDB.tombstoneStream(streamName);

            // Try to append - should fail
            const result = await kurrentDB.appendToStream(streamName, {
                id: uuid(),
                type: 'TestEvent',
                data: {}
            }, { expectedRevision: 'any' });

            expect(result.success).toBe(false);
        });
    });
});
