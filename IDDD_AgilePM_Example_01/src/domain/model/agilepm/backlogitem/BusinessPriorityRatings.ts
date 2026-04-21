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
 * Value object containing the raw ratings for business priority calculation.
 * Uses Cost of Delay / Weighted Shortest Job First (WSJF) model.
 *
 * Each rating is a relative value between 1 and 9.
 */
export class BusinessPriorityRatings {
    private readonly _benefit: number;
    private readonly _penalty: number;
    private readonly _cost: number;
    private readonly _risk: number;

    private constructor(benefit: number, penalty: number, cost: number, risk: number) {
        BusinessPriorityRatings.assertInRange(benefit, 'Relative benefit must be between 1 and 9.');
        BusinessPriorityRatings.assertInRange(penalty, 'Relative penalty must be between 1 and 9.');
        BusinessPriorityRatings.assertInRange(cost, 'Relative cost must be between 1 and 9.');
        BusinessPriorityRatings.assertInRange(risk, 'Relative risk must be between 1 and 9.');

        this._benefit = benefit;
        this._penalty = penalty;
        this._cost = cost;
        this._risk = risk;

        Object.freeze(this);
    }

    private static assertInRange(value: number, message: string): void {
        if (value < 1 || value > 9) {
            throw new Error(message);
        }
    }

    static with(benefit: number, penalty: number, cost: number, risk: number): BusinessPriorityRatings {
        return new BusinessPriorityRatings(benefit, penalty, cost, risk);
    }

    static copy(other: BusinessPriorityRatings): BusinessPriorityRatings {
        return new BusinessPriorityRatings(other._benefit, other._penalty, other._cost, other._risk);
    }

    withAdjustedBenefit(benefit: number): BusinessPriorityRatings {
        return new BusinessPriorityRatings(benefit, this._penalty, this._cost, this._risk);
    }

    withAdjustedCost(cost: number): BusinessPriorityRatings {
        return new BusinessPriorityRatings(this._benefit, this._penalty, cost, this._risk);
    }

    withAdjustedPenalty(penalty: number): BusinessPriorityRatings {
        return new BusinessPriorityRatings(this._benefit, penalty, this._cost, this._risk);
    }

    withAdjustedRisk(risk: number): BusinessPriorityRatings {
        return new BusinessPriorityRatings(this._benefit, this._penalty, this._cost, risk);
    }

    get benefit(): number {
        return this._benefit;
    }

    get penalty(): number {
        return this._penalty;
    }

    get cost(): number {
        return this._cost;
    }

    get risk(): number {
        return this._risk;
    }

    equals(other: BusinessPriorityRatings): boolean {
        if (!other) return false;
        return (
            this._benefit === other._benefit &&
            this._penalty === other._penalty &&
            this._cost === other._cost &&
            this._risk === other._risk
        );
    }

    toString(): string {
        return `BusinessPriorityRatings [benefit=${this._benefit}, cost=${this._cost}, penalty=${this._penalty}, risk=${this._risk}]`;
    }
}
