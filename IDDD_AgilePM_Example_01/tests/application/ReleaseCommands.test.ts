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
import { ReleaseCommands } from '../../src/application/ReleaseCommands';

/**
 * ReleaseCommands tests.
 *
 * Note: Release scheduling is tested via ProductCommands.scheduleRelease(),
 * as the Ubiquitous Language expresses that a Product schedules a Release.
 *
 * Release archive/schedule/unschedule behavior is tested at the domain level in Release.test.ts.
 * ReleaseCommands methods are thin wrappers over Release.of() + release methods.
 */
describe('ReleaseCommands', () => {
    it('should be instantiable', () => {
        const commands = new ReleaseCommands();
        expect(commands).toBeDefined();
        expect(typeof commands.archiveRelease).toBe('function');
        expect(typeof commands.scheduleBacklogItem).toBe('function');
        expect(typeof commands.unscheduleBacklogItem).toBe('function');
    });
});
