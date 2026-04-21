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

/**
 * Value object representing story point estimation.
 * Uses Fibonacci-inspired sequence for relative sizing.
 */
export class StoryPoints {
    private static readonly VALID_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
    private readonly _points: number;

    private constructor(points: number) {
        if (!StoryPoints.VALID_POINTS.includes(points as typeof StoryPoints.VALID_POINTS[number])) {
            throw new Error(
                `Invalid story points: ${points}. Must be one of ${StoryPoints.VALID_POINTS.join(', ')}`
            );
        }
        this._points = points;
    }

    static of(points: number): StoryPoints {
        return new StoryPoints(points);
    }

    static one(): StoryPoints {
        return new StoryPoints(1);
    }

    static two(): StoryPoints {
        return new StoryPoints(2);
    }

    static three(): StoryPoints {
        return new StoryPoints(3);
    }

    static five(): StoryPoints {
        return new StoryPoints(5);
    }

    static eight(): StoryPoints {
        return new StoryPoints(8);
    }

    static thirteen(): StoryPoints {
        return new StoryPoints(13);
    }

    static twentyOne(): StoryPoints {
        return new StoryPoints(21);
    }

    get points(): number {
        return this._points;
    }

    equals(other: StoryPoints): boolean {
        if (!other) return false;
        return this._points === other._points;
    }

    toString(): string {
        return `${this._points} points`;
    }
}
