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

import { BusinessPriorityRatings } from './BusinessPriorityRatings';
import { BusinessPriorityTotals } from './BusinessPriorityTotals';

/**
 * Value object representing the business priority of a backlog item.
 * Wraps BusinessPriorityRatings and provides calculation methods
 * that compute percentages and priority against BusinessPriorityTotals.
 */
export class BusinessPriority {
    private readonly _ratings: BusinessPriorityRatings;

    private constructor(ratings: BusinessPriorityRatings) {
        this._ratings = ratings;
        Object.freeze(this);
    }

    static of(benefit: number, penalty: number, cost: number, risk: number): BusinessPriority {
        return new BusinessPriority(BusinessPriorityRatings.with(benefit, penalty, cost, risk));
    }

    costPercentage(totals: BusinessPriorityTotals): number {
        return 100 * this._ratings.cost / totals.totalCost;
    }

    priority(totals: BusinessPriorityTotals): number {
        const costAndRisk = this.costPercentage(totals) + this.riskPercentage(totals);
        return this.valuePercentage(totals) / costAndRisk;
    }

    riskPercentage(totals: BusinessPriorityTotals): number {
        return 100 * this._ratings.risk / totals.totalRisk;
    }

    totalValue(): number {
        return this._ratings.benefit + this._ratings.penalty;
    }

    valuePercentage(totals: BusinessPriorityTotals): number {
        return 100 * this.totalValue() / totals.totalValue;
    }

    get ratings(): BusinessPriorityRatings {
        return this._ratings;
    }

    equals(other: BusinessPriority): boolean {
        if (!other) return false;
        return this._ratings.equals(other._ratings);
    }

    toString(): string {
        return `BusinessPriority [ratings=${this._ratings}]`;
    }
}
