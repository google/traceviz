/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/

/**
 * @fileoverview An override of HttpDataFetcher for testing.
 */

import { Observable, ReplaySubject, Subject } from 'rxjs';
import { Request } from '../protocol/request_interface.js';
import { Response } from '../protocol/response_interface.js';
import { DataFetcherInterface } from './data_fetcher_interface.js';

export class TestDataFetcher implements DataFetcherInterface {
  requestChannel = new Subject<Request>();
  // Enqueue up to one response for broadcasting.
  responseChannel = new ReplaySubject<Response>(1);

  fetch(req: Request): Observable<Response> {
    this.requestChannel.next(req);
    return this.responseChannel;
  }

  reset() {
    this.responseChannel = new ReplaySubject<Response>(1);
  }
}

export const GLOBAL_TEST_DATA_FETCHER = new TestDataFetcher();
