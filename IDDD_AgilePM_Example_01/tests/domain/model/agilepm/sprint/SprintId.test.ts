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
import { SprintId } from '../../../../../src/domain/model/agilepm/sprint/SprintId';

describe('SprintId', () => {
    describe('of', () => {
        it('should create an ID from a string', () => {
            const id = SprintId.of('sprint-123');

            expect(id.id).toBe('sprint-123');
        });

        it('should throw error for empty string', () => {
            expect(() => SprintId.of('')).toThrow('SprintId cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => SprintId.of('   ')).toThrow('SprintId cannot be empty');
        });

        it('should throw error for null', () => {
            expect(() => SprintId.of(null as unknown as string)).toThrow('SprintId cannot be empty');
        });

        it('should throw error for undefined', () => {
            expect(() => SprintId.of(undefined as unknown as string)).toThrow('SprintId cannot be empty');
        });
    });

    describe('generate', () => {
        it('should create a unique ID', () => {
            const id = SprintId.generate();

            expect(id.id).toBeDefined();
            expect(id.id.length).toBeGreaterThan(0);
        });

        it('should create different IDs on each call', () => {
            const id1 = SprintId.generate();
            const id2 = SprintId.generate();

            expect(id1.id).not.toBe(id2.id);
        });
    });

    describe('equals', () => {
        it('should return true for same ID value', () => {
            const id1 = SprintId.of('sprint-123');
            const id2 = SprintId.of('sprint-123');

            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false for different ID values', () => {
            const id1 = SprintId.of('sprint-123');
            const id2 = SprintId.of('sprint-456');

            expect(id1.equals(id2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const id = SprintId.of('sprint-123');

            expect(id.equals(null as unknown as SprintId)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const id = SprintId.of('sprint-123');

            expect(id.equals(undefined as unknown as SprintId)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the ID string', () => {
            const id = SprintId.of('sprint-123');

            expect(id.toString()).toBe('sprint-123');
        });
    });

    describe('id getter', () => {
        it('should return the ID string', () => {
            const id = SprintId.of('sprint-123');

            expect(id.id).toBe('sprint-123');
        });
    });
});
