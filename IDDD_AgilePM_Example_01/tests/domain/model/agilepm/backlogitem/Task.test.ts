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
import { Task } from '../../../../../src/domain/model/agilepm/backlogitem/Task';
import { TaskId } from '../../../../../src/domain/model/agilepm/backlogitem/TaskId';
import { TaskStatus } from '../../../../../src/domain/model/agilepm/backlogitem/TaskStatus';
import { TeamMemberId } from '../../../../../src/domain/model/agilepm/team/TeamMemberId';

describe('Task', () => {
    describe('construction', () => {
        it('should create task with valid name and description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Implement login form', 'Create HTML/CSS for login');

            expect(task.taskId).toBe(taskId);
            expect(task.name).toBe('Implement login form');
            expect(task.description).toBe('Create HTML/CSS for login');
            expect(task.status).toBe(TaskStatus.NotStarted);
            expect(task.hoursEstimated).toBe(0);
            expect(task.hoursRemaining).toBe(0);
            expect(task.volunteerId).toBeUndefined();
            expect(task.hasVolunteer).toBe(false);
            expect(task.isDone).toBe(false);
        });

        it('should trim name and description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, '  Task name  ', '  Description  ');

            expect(task.name).toBe('Task name');
            expect(task.description).toBe('Description');
        });

        it('should handle null description gracefully', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task name', null as unknown as string);

            expect(task.description).toBe('');
        });

        it('should handle undefined description gracefully', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task name', undefined as unknown as string);

            expect(task.description).toBe('');
        });

        it('should throw error when name is empty', () => {
            const taskId = TaskId.unique();

            expect(() => new Task(taskId, '', 'Description')).toThrow('Task name cannot be empty');
        });

        it('should throw error when name is only whitespace', () => {
            const taskId = TaskId.unique();

            expect(() => new Task(taskId, '   ', 'Description')).toThrow('Task name cannot be empty');
        });

        it('should throw error when name is null', () => {
            const taskId = TaskId.unique();

            expect(() => new Task(taskId, null as unknown as string, 'Description')).toThrow('Task name cannot be empty');
        });

        it('should throw error when name is undefined', () => {
            const taskId = TaskId.unique();

            expect(() => new Task(taskId, undefined as unknown as string, 'Description')).toThrow('Task name cannot be empty');
        });
    });

    describe('describe', () => {
        it('should update description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Original description');

            task.describe('Updated description');

            expect(task.description).toBe('Updated description');
        });

        it('should trim description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Original');

            task.describe('  New description  ');

            expect(task.description).toBe('New description');
        });

        it('should handle null description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Original');

            task.describe(null as unknown as string);

            expect(task.description).toBe('');
        });

        it('should handle undefined description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Original');

            task.describe(undefined as unknown as string);

            expect(task.description).toBe('');
        });

        it('should allow empty description', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Original');

            task.describe('');

            expect(task.description).toBe('');
        });
    });

    describe('estimateHours', () => {
        it('should set hours estimated and remaining', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(8, 8);

            expect(task.hoursEstimated).toBe(8);
            expect(task.hoursRemaining).toBe(8);
        });

        it('should allow hours remaining less than estimated', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(8, 4);

            expect(task.hoursEstimated).toBe(8);
            expect(task.hoursRemaining).toBe(4);
        });

        it('should allow zero hours estimated and remaining', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(0, 0);

            expect(task.hoursEstimated).toBe(0);
            expect(task.hoursRemaining).toBe(0);
        });

        it('should throw error when hours estimated is negative', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(() => task.estimateHours(-1, 0)).toThrow('Hours estimated cannot be negative');
        });

        it('should throw error when hours remaining is negative', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(() => task.estimateHours(8, -1)).toThrow('Hours remaining cannot be negative');
        });

        it('should throw error when hours remaining exceeds hours estimated', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(() => task.estimateHours(8, 10)).toThrow('Hours remaining cannot exceed hours estimated');
        });

        it('should allow updating hours multiple times', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(8, 8);
            task.estimateHours(16, 12);

            expect(task.hoursEstimated).toBe(16);
            expect(task.hoursRemaining).toBe(12);
        });
    });

    describe('estimationLog', () => {
        it('should start with empty estimation log', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.estimationLog).toHaveLength(0);
        });

        it('should add entry when hours are estimated', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(8, 8);

            expect(task.estimationLog).toHaveLength(1);
            expect(task.estimationLog[0].hoursRemaining).toBe(8);
            expect(task.estimationLog[0].taskId.equals(taskId)).toBe(true);
        });

        it('should update same-day entry instead of adding new one', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(8, 8);
            task.estimateHours(8, 4);

            expect(task.estimationLog).toHaveLength(1);
            expect(task.estimationLog[0].hoursRemaining).toBe(4);
        });

        it('should track final hours remaining after multiple same-day estimates', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.estimateHours(16, 16);
            task.estimateHours(16, 12);
            task.estimateHours(16, 8);

            expect(task.estimationLog).toHaveLength(1);
            expect(task.estimationLog[0].hoursRemaining).toBe(8);
        });
    });

    describe('changeStatus', () => {
        it('should change status to InProgress', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.InProgress);

            expect(task.status).toBe(TaskStatus.InProgress);
            expect(task.isDone).toBe(false);
        });

        it('should change status to Done', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Done);

            expect(task.status).toBe(TaskStatus.Done);
            expect(task.isDone).toBe(true);
        });

        it('should change status to Impediment', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Impediment);

            expect(task.status).toBe(TaskStatus.Impediment);
            expect(task.isDone).toBe(false);
        });

        it('should change status back to NotStarted', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.InProgress);
            task.changeStatus(TaskStatus.NotStarted);

            expect(task.status).toBe(TaskStatus.NotStarted);
            expect(task.isDone).toBe(false);
        });

        it('should allow changing from Done to other status', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Done);
            task.changeStatus(TaskStatus.InProgress);

            expect(task.status).toBe(TaskStatus.InProgress);
            expect(task.isDone).toBe(false);
        });
    });

    describe('assignVolunteer', () => {
        it('should assign volunteer to task', () => {
            const taskId = TaskId.unique();
            const volunteerId = TeamMemberId.of('tenant-1', 'volunteer-1');
            const task = new Task(taskId, 'Task', 'Description');

            task.assignVolunteer(volunteerId);

            expect(task.volunteerId).toBe(volunteerId);
            expect(task.hasVolunteer).toBe(true);
        });

        it('should allow reassigning volunteer', () => {
            const taskId = TaskId.unique();
            const volunteerId1 = TeamMemberId.of('tenant-1', 'volunteer-1');
            const volunteerId2 = TeamMemberId.of('tenant-1', 'volunteer-2');
            const task = new Task(taskId, 'Task', 'Description');

            task.assignVolunteer(volunteerId1);
            task.assignVolunteer(volunteerId2);

            expect(task.volunteerId).toBe(volunteerId2);
            expect(task.hasVolunteer).toBe(true);
        });
    });

    describe('rename', () => {
        it('should rename task', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original name', 'Description');

            task.rename('New name');

            expect(task.name).toBe('New name');
        });

        it('should trim new name', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original', 'Description');

            task.rename('  New name  ');

            expect(task.name).toBe('New name');
        });

        it('should throw error when new name is empty', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original', 'Description');

            expect(() => task.rename('')).toThrow('Task name cannot be empty');
        });

        it('should throw error when new name is only whitespace', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original', 'Description');

            expect(() => task.rename('   ')).toThrow('Task name cannot be empty');
        });

        it('should throw error when new name is null', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original', 'Description');

            expect(() => task.rename(null as unknown as string)).toThrow('Task name cannot be empty');
        });

        it('should throw error when new name is undefined', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Original', 'Description');

            expect(() => task.rename(undefined as unknown as string)).toThrow('Task name cannot be empty');
        });
    });

    describe('equals', () => {
        it('should be equal when taskIds match', () => {
            const taskId = TaskId.unique();
            const task1 = new Task(taskId, 'Task 1', 'Description 1');
            const task2 = new Task(taskId, 'Task 2', 'Description 2');

            expect(task1.equals(task2)).toBe(true);
        });

        it('should not be equal when taskIds differ', () => {
            const taskId1 = TaskId.unique();
            const taskId2 = TaskId.unique();
            const task1 = new Task(taskId1, 'Task', 'Description');
            const task2 = new Task(taskId2, 'Task', 'Description');

            expect(task1.equals(task2)).toBe(false);
        });

        it('should return false when comparing with null', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.equals(null as unknown as Task)).toBe(false);
        });

        it('should return false when comparing with undefined', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.equals(undefined as unknown as Task)).toBe(false);
        });
    });

    describe('getter properties', () => {
        it('should return correct taskId', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.taskId).toBe(taskId);
            expect(task.taskId.equals(taskId)).toBe(true);
        });

        it('should return correct hasVolunteer when no volunteer assigned', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.hasVolunteer).toBe(false);
        });

        it('should return correct hasVolunteer when volunteer assigned', () => {
            const taskId = TaskId.unique();
            const volunteerId = TeamMemberId.of('tenant-1', 'volunteer-1');
            const task = new Task(taskId, 'Task', 'Description');

            task.assignVolunteer(volunteerId);

            expect(task.hasVolunteer).toBe(true);
        });

        it('should return correct isDone when status is NotStarted', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            expect(task.isDone).toBe(false);
        });

        it('should return correct isDone when status is InProgress', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.InProgress);

            expect(task.isDone).toBe(false);
        });

        it('should return correct isDone when status is Impediment', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Impediment);

            expect(task.isDone).toBe(false);
        });

        it('should return correct isDone when status is Done', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Done);

            expect(task.isDone).toBe(true);
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete task lifecycle', () => {
            const taskId = TaskId.unique();
            const volunteerId = TeamMemberId.of('tenant-1', 'volunteer-1');
            const task = new Task(taskId, 'Implement feature', 'Create the feature');

            // Initial state
            expect(task.status).toBe(TaskStatus.NotStarted);
            expect(task.hasVolunteer).toBe(false);
            expect(task.hoursEstimated).toBe(0);
            expect(task.hoursRemaining).toBe(0);

            // Estimate hours
            task.estimateHours(8, 8);
            expect(task.hoursEstimated).toBe(8);
            expect(task.hoursRemaining).toBe(8);

            // Assign volunteer
            task.assignVolunteer(volunteerId);
            expect(task.hasVolunteer).toBe(true);
            expect(task.volunteerId?.equals(volunteerId)).toBe(true);

            // Start working
            task.changeStatus(TaskStatus.InProgress);
            expect(task.status).toBe(TaskStatus.InProgress);
            expect(task.isDone).toBe(false);

            // Update remaining hours
            task.estimateHours(8, 4);
            expect(task.hoursRemaining).toBe(4);

            // Hit impediment
            task.changeStatus(TaskStatus.Impediment);
            expect(task.status).toBe(TaskStatus.Impediment);

            // Resume work
            task.changeStatus(TaskStatus.InProgress);

            // Update description
            task.describe('Updated implementation details');
            expect(task.description).toBe('Updated implementation details');

            // Rename task
            task.rename('Implement feature v2');
            expect(task.name).toBe('Implement feature v2');

            // Complete task
            task.estimateHours(8, 0);
            task.changeStatus(TaskStatus.Done);
            expect(task.isDone).toBe(true);
            expect(task.hoursRemaining).toBe(0);
        });

        it('should allow task without volunteer to be completed', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Done);

            expect(task.isDone).toBe(true);
            expect(task.hasVolunteer).toBe(false);
        });

        it('should allow task without hours estimate to be completed', () => {
            const taskId = TaskId.unique();
            const task = new Task(taskId, 'Task', 'Description');

            task.changeStatus(TaskStatus.Done);

            expect(task.isDone).toBe(true);
            expect(task.hoursEstimated).toBe(0);
        });
    });
});
