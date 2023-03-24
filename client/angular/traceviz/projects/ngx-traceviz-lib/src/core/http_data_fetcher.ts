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

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { Observable } from "rxjs/internal/Observable";
import { OperatorFunction } from "rxjs/internal/types";
import { catchError, map } from "rxjs/operators";
import { ConfigurationError, Request, Response, ResponseNode, Severity, fromObject, toObject } from "traceviz-client-core";
import { DataFetcherInterface } from "traceviz-client-core";
import { AppCoreService } from '../app_core_service/app_core.service';
import { throwError } from 'rxjs/internal/observable/throwError';

const SOURCE = 'http_data_fetcher';

const emptyResponse: Response = {
    series: new Map<string, ResponseNode>([])
};

/**
 * Returns an rxjs operator mapping json responses to Response.
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
 * A data fetcher implementation that fetches data via HTTP requests.
 */
@Injectable({ providedIn: 'root' })
export class HttpDataFetcher implements DataFetcherInterface {
    constructor(
        private readonly http: HttpClient,
        private readonly appCoreService: AppCoreService) { }

    fetch(req: Request): Observable<Response> {
        const reqStr: string = JSON.stringify(toObject(req));
        return this.http.get<string>(DATA_QUERY_NAME, {
            params: new HttpParams().set(DATA_REQUEST_PARAM_NAME, reqStr),
        })
            .pipe(
                mapToResponse(),
                catchError(err => {
                    this.appCoreService.appCore.err(
                        new ConfigurationError(err.error)
                            .from(SOURCE)
                            .at(Severity.FATAL));
                    return throwError(() => err);
                }),
            );
    }
}