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
import { ProductId } from '../../../../../src/domain/model/agilepm/product/ProductId';

describe('ProductId', () => {
    describe('of', () => {
        it('should create an ID from a string', () => {
            const id = ProductId.of('product-123');

            expect(id.id).toBe('product-123');
        });

        it('should throw error for empty string', () => {
            expect(() => ProductId.of('')).toThrow('ProductId cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => ProductId.of('   ')).toThrow('ProductId cannot be empty');
        });

        it('should throw error for null', () => {
            expect(() => ProductId.of(null as unknown as string)).toThrow('ProductId cannot be empty');
        });

        it('should throw error for undefined', () => {
            expect(() => ProductId.of(undefined as unknown as string)).toThrow('ProductId cannot be empty');
        });
    });

    describe('unique', () => {
        it('should create a unique ID', () => {
            const id = ProductId.unique();

            expect(id.id).toBeDefined();
            expect(id.id.length).toBeGreaterThan(0);
        });

        it('should create different IDs on each call', () => {
            const id1 = ProductId.unique();
            const id2 = ProductId.unique();

            expect(id1.id).not.toBe(id2.id);
        });
    });

    describe('equals', () => {
        it('should return true for same ID value', () => {
            const id1 = ProductId.of('product-123');
            const id2 = ProductId.of('product-123');

            expect(id1.equals(id2)).toBe(true);
        });

        it('should return false for different ID values', () => {
            const id1 = ProductId.of('product-123');
            const id2 = ProductId.of('product-456');

            expect(id1.equals(id2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const id = ProductId.of('product-123');

            expect(id.equals(null as unknown as ProductId)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const id = ProductId.of('product-123');

            expect(id.equals(undefined as unknown as ProductId)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the ID string', () => {
            const id = ProductId.of('product-123');

            expect(id.toString()).toBe('product-123');
        });
    });

    describe('id getter', () => {
        it('should return the ID string', () => {
            const id = ProductId.of('product-123');

            expect(id.id).toBe('product-123');
        });
    });
});
