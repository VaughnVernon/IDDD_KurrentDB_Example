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
 * Value object containing the aggregated totals used for priority calculation.
 * These totals come from summing all backlog items' ratings.
 */
export class BusinessPriorityTotals {
    private constructor(
        private readonly _totalBenefit: number,
        private readonly _totalPenalty: number,
        private readonly _totalCost: number,
        private readonly _totalRisk: number
    ) {
        Object.freeze(this);
    }

    /**
     * Create business priority totals.
     */
    static of(
        totalBenefit: number,
        totalPenalty: number,
        totalCost: number,
        totalRisk: number
    ): BusinessPriorityTotals {
        return new BusinessPriorityTotals(totalBenefit, totalPenalty, totalCost, totalRisk);
    }

    /**
     * Create zero totals.
     */
    static zero(): BusinessPriorityTotals {
        return new BusinessPriorityTotals(0, 0, 0, 0);
    }

    get totalBenefit(): number {
        return this._totalBenefit;
    }

    get totalPenalty(): number {
        return this._totalPenalty;
    }

    get totalCost(): number {
        return this._totalCost;
    }

    get totalRisk(): number {
        return this._totalRisk;
    }

    /**
     * Total value = benefit + penalty (what we gain and what we avoid losing).
     */
    get totalValue(): number {
        return this._totalBenefit + this._totalPenalty;
    }

    /**
     * Total effort = cost + risk (implementation + uncertainty).
     */
    get totalEffort(): number {
        return this._totalCost + this._totalRisk;
    }

    equals(other: BusinessPriorityTotals): boolean {
        if (!other) return false;
        return (
            this._totalBenefit === other._totalBenefit &&
            this._totalPenalty === other._totalPenalty &&
            this._totalCost === other._totalCost &&
            this._totalRisk === other._totalRisk
        );
    }

    toString(): string {
        return `BusinessPriorityTotals[benefit=${this._totalBenefit}, penalty=${this._totalPenalty}, cost=${this._totalCost}, risk=${this._totalRisk}]`;
    }
}
