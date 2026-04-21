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
import { Tenant } from '../../../../../src/domain/model/agilepm/tenant/Tenant';

describe('Tenant', () => {
    describe('of', () => {
        it('should create a tenant from a string', () => {
            const tenant = Tenant.of('tenant-123');

            expect(tenant.id).toBe('tenant-123');
        });

        it('should throw error for empty string', () => {
            expect(() => Tenant.of('')).toThrow('TenantId cannot be empty');
        });

        it('should throw error for whitespace-only string', () => {
            expect(() => Tenant.of('   ')).toThrow('TenantId cannot be empty');
        });

        it('should throw error for null', () => {
            expect(() => Tenant.of(null as unknown as string)).toThrow('TenantId cannot be empty');
        });

        it('should throw error for undefined', () => {
            expect(() => Tenant.of(undefined as unknown as string)).toThrow('TenantId cannot be empty');
        });
    });

    describe('unique', () => {
        it('should create a unique tenant ID', () => {
            const tenant = Tenant.unique();

            expect(tenant.id).toBeDefined();
            expect(tenant.id.length).toBeGreaterThan(0);
        });

        it('should create different IDs on each call', () => {
            const tenant1 = Tenant.unique();
            const tenant2 = Tenant.unique();

            expect(tenant1.id).not.toBe(tenant2.id);
        });
    });

    describe('equals', () => {
        it('should return true for same ID value', () => {
            const tenant1 = Tenant.of('tenant-123');
            const tenant2 = Tenant.of('tenant-123');

            expect(tenant1.equals(tenant2)).toBe(true);
        });

        it('should return false for different ID values', () => {
            const tenant1 = Tenant.of('tenant-123');
            const tenant2 = Tenant.of('tenant-456');

            expect(tenant1.equals(tenant2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const tenant = Tenant.of('tenant-123');

            expect(tenant.equals(null as unknown as Tenant)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const tenant = Tenant.of('tenant-123');

            expect(tenant.equals(undefined as unknown as Tenant)).toBe(false);
        });
    });

    describe('toString', () => {
        it('should return the ID string', () => {
            const tenant = Tenant.of('tenant-123');

            expect(tenant.toString()).toBe('tenant-123');
        });
    });

    describe('id getter', () => {
        it('should return the ID string', () => {
            const tenant = Tenant.of('tenant-123');

            expect(tenant.id).toBe('tenant-123');
        });
    });
});
