/**
 * @fileoverview GlobalState is a global singleton associating (string) keys
 * with Values, representing global filters, selections, and similar things.
 */
import { BehaviorSubject } from 'rxjs';
import { Value } from '../value/value.js';
import { GlobalStateInterface } from './global_state_interface.js';
/**
 * Contains globally-shared application state in a key/value mapping.
 * GlobalState implements GlobalStateInterface, and additionally provides
 * methods for resetting the key/value mapping and for adding new keys.
 *
 * All TraceViz components may fetch Values by key from the GlobalState, and
 * may freely read, update, or subscribe to those Values, but may not add new
 * keys, change the set of keys, or change the Value type associated with a
 * given key.
 */
export declare class GlobalState extends BehaviorSubject<string[]> implements GlobalStateInterface {
    private valuesByKey;
    constructor();
    /** Clears the entire key/value map. */
    reset(): void;
    /**
     * Sets the specified key to the specified value in the global state mapping.
     * It is an error to call set() on a key already present in the global
     * mapping.
     */
    set(key: string, val: Value): void;
    /**
     * Returns the Value associated with the specified key in the global state
     * mapping.  It is an error to call get() on a key not present in the global
     * mapping.
     */
    get(key: string): Value;
}
