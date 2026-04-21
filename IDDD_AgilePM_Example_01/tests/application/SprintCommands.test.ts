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
import { SprintCommands } from '../../src/application/SprintCommands';

/**
 * SprintCommands tests.
 *
 * Note: Sprint planning is tested via ProductCommands.planSprint(),
 * as the Ubiquitous Language expresses that a Product plans a Sprint.
 *
 * Sprint commit/uncommit behavior is tested at the domain level in Sprint.test.ts.
 * SprintCommands.commitBacklogItem/uncommitBacklogItem are thin wrappers over
 * Sprint.of() + sprint.commit()/sprint.uncommit().
 */
describe('SprintCommands', () => {
    it('should be instantiable', () => {
        const commands = new SprintCommands();
        expect(commands).toBeDefined();
        expect(typeof commands.commitBacklogItem).toBe('function');
        expect(typeof commands.uncommitBacklogItem).toBe('function');
    });
});
