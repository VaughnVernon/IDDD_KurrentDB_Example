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

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_PORT = process.env.KURRENTDB_TEST_PORT || '2114';
const CONTAINER_NAME = 'agilepm-kurrentdb-test';
const COMPOSE_FILE = 'docker-compose.test.yml';
const MAX_WAIT_MS = 60000;
const POLL_INTERVAL_MS = 1000;

/**
 * Check if the container is healthy by querying the health endpoint.
 */
async function isHealthy(): Promise<boolean> {
    try {
        const response = await fetch(`http://localhost:${TEST_PORT}/health/live`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Wait for the container to become healthy.
 */
async function waitForHealthy(): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
        if (await isHealthy()) {
            console.log(`KurrentDB test container is healthy on port ${TEST_PORT}`);
            return;
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(`KurrentDB test container did not become healthy within ${MAX_WAIT_MS}ms`);
}

/**
 * Check if the container is already running.
 */
async function isContainerRunning(): Promise<boolean> {
    try {
        const { stdout } = await execAsync(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`);
        return stdout.trim() === CONTAINER_NAME;
    } catch {
        return false;
    }
}

/**
 * Start the KurrentDB test container.
 */
async function startContainer(): Promise<void> {
    console.log(`Starting KurrentDB test container on port ${TEST_PORT}...`);

    await execAsync(
        `KURRENTDB_TEST_PORT=${TEST_PORT} docker compose -f ${COMPOSE_FILE} up -d`,
        { cwd: process.cwd() }
    );
}

/**
 * Stop the KurrentDB test container.
 */
async function stopContainer(): Promise<void> {
    console.log('Stopping KurrentDB test container...');

    try {
        await execAsync(
            `docker compose -f ${COMPOSE_FILE} down -v`,
            { cwd: process.cwd() }
        );
        console.log('KurrentDB test container stopped');
    } catch (error) {
        console.error('Failed to stop KurrentDB test container:', error);
    }
}

/**
 * Vitest global setup - starts KurrentDB before tests run.
 */
export async function setup(): Promise<void> {
    // Set the connection URL for tests
    process.env.TEST_KURRENTDB_URL = `esdb://localhost:${TEST_PORT}?tls=false`;

    // Check if container is already running
    if (await isContainerRunning()) {
        console.log(`KurrentDB test container already running on port ${TEST_PORT}`);
        if (await isHealthy()) {
            return;
        }
        console.log('Container running but not healthy, waiting...');
        await waitForHealthy();
        return;
    }

    // Start the container
    await startContainer();
    await waitForHealthy();
}

/**
 * Vitest global teardown - stops KurrentDB after tests complete.
 */
export async function teardown(): Promise<void> {
    // Only stop if we started it (check env var to allow keeping it running)
    if (process.env.KURRENTDB_KEEP_RUNNING !== 'true') {
        await stopContainer();
    } else {
        console.log('Keeping KurrentDB test container running (KURRENTDB_KEEP_RUNNING=true)');
    }
}
