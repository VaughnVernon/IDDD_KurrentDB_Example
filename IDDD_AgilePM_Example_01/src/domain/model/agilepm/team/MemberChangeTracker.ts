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
 * Value object that tracks changes to team member information.
 * Used to detect when member details have changed for event publishing.
 */
export class MemberChangeTracker {
    private constructor(
        private readonly _emailAddressChangedOn: Date | undefined,
        private readonly _nameChangedOn: Date | undefined,
        private readonly _enabledOn: Date | undefined,
        private readonly _disabledOn: Date | undefined
    ) {
        Object.freeze(this);
    }

    /**
     * Create a new tracker with no changes recorded.
     */
    static create(): MemberChangeTracker {
        return new MemberChangeTracker(undefined, undefined, undefined, undefined);
    }

    /**
     * Reconstitute from stored state.
     */
    static fromState(
        emailAddressChangedOn: Date | undefined,
        nameChangedOn: Date | undefined,
        enabledOn: Date | undefined,
        disabledOn: Date | undefined
    ): MemberChangeTracker {
        return new MemberChangeTracker(emailAddressChangedOn, nameChangedOn, enabledOn, disabledOn);
    }

    get emailAddressChangedOn(): Date | undefined {
        return this._emailAddressChangedOn;
    }

    get nameChangedOn(): Date | undefined {
        return this._nameChangedOn;
    }

    get enabledOn(): Date | undefined {
        return this._enabledOn;
    }

    get disabledOn(): Date | undefined {
        return this._disabledOn;
    }

    /**
     * Check if email address has changed since the given date.
     */
    hasEmailAddressChangedSince(date: Date): boolean {
        return this._emailAddressChangedOn !== undefined &&
            this._emailAddressChangedOn > date;
    }

    /**
     * Check if name has changed since the given date.
     */
    hasNameChangedSince(date: Date): boolean {
        return this._nameChangedOn !== undefined &&
            this._nameChangedOn > date;
    }

    /**
     * Record an email address change.
     */
    emailAddressChanged(on: Date = new Date()): MemberChangeTracker {
        return new MemberChangeTracker(on, this._nameChangedOn, this._enabledOn, this._disabledOn);
    }

    /**
     * Record a name change.
     */
    nameChanged(on: Date = new Date()): MemberChangeTracker {
        return new MemberChangeTracker(this._emailAddressChangedOn, on, this._enabledOn, this._disabledOn);
    }

    /**
     * Record enablement.
     */
    enabled(on: Date = new Date()): MemberChangeTracker {
        return new MemberChangeTracker(this._emailAddressChangedOn, this._nameChangedOn, on, undefined);
    }

    /**
     * Record disablement.
     */
    disabled(on: Date = new Date()): MemberChangeTracker {
        return new MemberChangeTracker(this._emailAddressChangedOn, this._nameChangedOn, undefined, on);
    }

    /**
     * Check if the member is currently enabled.
     */
    get isEnabled(): boolean {
        if (this._enabledOn === undefined && this._disabledOn === undefined) {
            return true; // Default to enabled
        }
        if (this._enabledOn === undefined) {
            return false;
        }
        if (this._disabledOn === undefined) {
            return true;
        }
        return this._enabledOn > this._disabledOn;
    }

    equals(other: MemberChangeTracker): boolean {
        if (!other) return false;
        return (
            this._emailAddressChangedOn?.getTime() === other._emailAddressChangedOn?.getTime() &&
            this._nameChangedOn?.getTime() === other._nameChangedOn?.getTime() &&
            this._enabledOn?.getTime() === other._enabledOn?.getTime() &&
            this._disabledOn?.getTime() === other._disabledOn?.getTime()
        );
    }
}
