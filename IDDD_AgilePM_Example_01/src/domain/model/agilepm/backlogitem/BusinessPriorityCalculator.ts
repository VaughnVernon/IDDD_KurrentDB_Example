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

import { BusinessPriority } from './BusinessPriority';
import { BusinessPriorityRatings } from './BusinessPriorityRatings';
import { BusinessPriorityTotals } from './BusinessPriorityTotals';

/**
 * Domain service that calculates business priority for backlog items.
 *
 * Uses the Weighted Shortest Job First (WSJF) / Cost of Delay Divided by Duration model:
 * Priority = (Value%) / (Cost% + Risk%)
 */
export class BusinessPriorityCalculator {
    /**
     * Calculate priorities for multiple backlog items.
     *
     * @param ratingsArray - Array of ratings for all backlog items to prioritize
     * @returns Array of calculated BusinessPriority in same order as input
     */
    static calculateAll(ratingsArray: BusinessPriorityRatings[]): BusinessPriority[] {
        const totals = this.calculateTotals(ratingsArray);
        return ratingsArray.map(ratings =>
            BusinessPriority.of(ratings.benefit, ratings.penalty, ratings.cost, ratings.risk)
        );
    }

    /**
     * Calculate totals from an array of ratings.
     */
    static calculateTotals(ratingsArray: BusinessPriorityRatings[]): BusinessPriorityTotals {
        let totalBenefit = 0;
        let totalPenalty = 0;
        let totalCost = 0;
        let totalRisk = 0;

        for (const ratings of ratingsArray) {
            totalBenefit += ratings.benefit;
            totalPenalty += ratings.penalty;
            totalCost += ratings.cost;
            totalRisk += ratings.risk;
        }

        return BusinessPriorityTotals.of(totalBenefit, totalPenalty, totalCost, totalRisk);
    }

    /**
     * Sort backlog items by priority (highest first).
     *
     * @param priorities - Array of calculated priorities
     * @param totals - The totals for computing priority values
     * @returns Indices sorted by priority value descending
     */
    static sortByPriority(priorities: BusinessPriority[], totals: BusinessPriorityTotals): number[] {
        return priorities
            .map((p, i) => ({ index: i, value: p.priority(totals) }))
            .sort((a, b) => b.value - a.value)
            .map(item => item.index);
    }
}
