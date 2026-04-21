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

import { stage, type Protocol } from 'domo-actors';
import { InMemoryDocumentStore, type DocumentStore } from 'domo-tactical';

/**
 * Protocol for creating InMemoryDocumentStore as an actor.
 */
const documentStoreProtocol: Protocol = {
    type: () => 'InMemoryDocumentStore',
    instantiator: () => ({
        instantiate: () => new InMemoryDocumentStore()
    })
};

/**
 * Creates the singleton InMemoryDocumentStore instance.
 * Must be called after the stage is available.
 */
export function createDocumentStore(): DocumentStore {
    return stage().actorFor(documentStoreProtocol, undefined, 'default');
}

// Lazy-initialized singleton
let _documentStore: DocumentStore | null = null;

/**
 * Returns the singleton DocumentStore instance.
 * Creates it on first access.
 */
export function documentStore(): DocumentStore {
    if (!_documentStore) {
        _documentStore = createDocumentStore();
    }
    return _documentStore;
}
