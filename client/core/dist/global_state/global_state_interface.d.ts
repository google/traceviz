import { Subject } from 'rxjs';
import { Value } from '../value/value.js';
/**
 * Extended by types that include the portion of the GlobalState API available
 * to all TraceViz components.  Provides lookup by key on global Values, and is
 * an Observable broadcasting changes to its managed set of keys.
 */
export interface GlobalStateInterface extends Subject<string[]> {
    /**
     * Returns the Value associated with the specified key in the global state
     * mapping.  It is an error to call get() on a key not present in the global
     * mapping.
     */
    get(key: string): Value;
}
