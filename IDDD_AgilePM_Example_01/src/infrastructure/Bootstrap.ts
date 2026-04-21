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

import { stage, Stage, Protocol } from 'domo-actors';
import { TestJournal } from 'domo-tactical/testkit';
import type { Journal } from 'domo-tactical';

/**
 * Journal registry key for the AgilePM bounded context.
 */
export const AGILEPM_JOURNAL_KEY = 'domo-tactical:agilepm.journal';

/**
 * Bootstrap the AgilePM application.
 * Initializes the Stage and registers shared infrastructure.
 */
export class Bootstrap {
    private static _instance: Bootstrap | null = null;
    private _stage: Stage;
    private _journal: Journal<string>;

    private constructor() {
        this._stage = stage();
        this._journal = new TestJournal<string>();
        this._stage.registerValue(AGILEPM_JOURNAL_KEY, this._journal);
    }

    /**
     * Initialize the bootstrap (singleton).
     */
    static initialize(): Bootstrap {
        if (!Bootstrap._instance) {
            Bootstrap._instance = new Bootstrap();
        }
        return Bootstrap._instance;
    }

    /**
     * Get the current bootstrap instance.
     */
    static instance(): Bootstrap {
        if (!Bootstrap._instance) {
            throw new Error('Bootstrap not initialized. Call Bootstrap.initialize() first.');
        }
        return Bootstrap._instance;
    }

    /**
     * Get the Stage.
     */
    get stage(): Stage {
        return this._stage;
    }

    /**
     * Get the Journal.
     */
    get journal(): Journal<string> {
        return this._journal;
    }

    /**
     * Create an actor using the Stage.
     */
    actorFor<T>(protocol: Protocol, ...parameters: unknown[]): T {
        return this._stage.actorFor<T>(protocol, undefined, undefined, undefined, ...parameters);
    }

    /**
     * Shutdown the application.
     */
    async close(): Promise<void> {
        await this._stage.close();
        Bootstrap._instance = null;
    }
}

/**
 * Convenience function to get the Stage.
 */
export function agilePMStage(): Stage {
    return Bootstrap.instance().stage;
}

/**
 * Convenience function to get the Journal.
 */
export function agilePMJournal(): Journal<string> {
    return Bootstrap.instance().journal;
}
