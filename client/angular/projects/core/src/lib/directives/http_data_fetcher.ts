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
 * @fileoverview A data fetcher using HTTP requests.
 */

import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {ConfigurationError, DataFetcherInterface, fromObject, Request, Response, toObject} from '@google/traceviz-client-core';
import {Observable, OperatorFunction, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {AppCoreService} from '../services/app_core.service';

/**
 * Returns an rxjs operator that maps json-encoded Data protos to
 * ProtoResponses.
 */
function mapToResponse(): OperatorFunction<string, Response> {
  return (source: Observable<string>) => source.pipe(map((value) => {
    const resp = fromObject(value);
    return resp;
  }));
}

const DATA_QUERY_NAME = '/GetData';
const DATA_REQUEST_PARAM_NAME = 'req';

/**
 * HttpDataFetcher is a DataFetcher that fetches data via HTTP requests.
 */
@Injectable({providedIn: 'root'})
export class HttpDataFetcher implements DataFetcherInterface {
  constructor(
      private readonly http: HttpClient,
      private readonly appCoreService: AppCoreService) {}

  fetch(req: Request): Observable<Response> {
    const reqstr: string = JSON.stringify(toObject(req));
    return this.http
        .get<string>(DATA_QUERY_NAME, {
          params: new HttpParams().set(DATA_REQUEST_PARAM_NAME, reqstr),
        })
        .pipe(
            mapToResponse(),
            catchError(err => {
              this.appCoreService.appCore.err(
                  // TODO(hamster) Create more types of errors than just
                  // configuration errors.
                  new ConfigurationError(err.error));
              return throwError(err);
            }),
        );
  }
}
