/**
 * @fileoverview Defines an interface for types providing backend fetch
 * services.
 */
import { Observable } from 'rxjs';
import { Request } from '../protocol/request_interface.js';
import { Response } from '../protocol/response_interface.js';
/**
 * Implemented by data fetchers that accept a Request and return a subscribable
 * Response.
 */
export interface DataFetcherInterface {
    fetch(req: Request): Observable<Response>;
}
