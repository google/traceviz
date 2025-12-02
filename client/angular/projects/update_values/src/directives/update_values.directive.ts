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

import {AfterContentInit, ContentChild, Directive, OnDestroy} from '@angular/core';
import {AppCoreService, DataSeriesDirective, InteractionsDirective, ValueMapDirective} from '@google/traceviz-angular-core';
import {Interactions} from '@traceviz/client-core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

const RESPONSE_PROPERTIES = 'response';

const UPDATE = 'update';

const supportedActions = new Array<[string, string]>(
    [RESPONSE_PROPERTIES, UPDATE],  // A data series response has arrived.
);

/**
 * A directive populating specified frontend Values from backend responses.
 *
 * Its data-series response should be a single ResponseNode whose properties
 * map keys in the value-map to new values.  If its fetch reaction has no
 * predicates, it is only issued at page load.
 *
 * Upon a new data-series response, all 'update' actions targeting
 * 'response' are performed.  The ResponseNode's properties are used
 * as the target properties.
 */
@Directive({
  standalone: false,
  selector: 'update-values',
})
export class UpdateValues implements AfterContentInit, OnDestroy {
  @ContentChild(ValueMapDirective) values: ValueMapDirective|undefined;
  @ContentChild(DataSeriesDirective) dataSeries: DataSeriesDirective|undefined;
  @ContentChild(InteractionsDirective, {descendants: false})
  interactionsDir: InteractionsDirective|undefined;

  readonly unsubscribe = new Subject<void>();
  private interactions: Interactions|undefined;

  constructor(private readonly appCoreService: AppCoreService) {}

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      this.interactions = this.interactionsDir?.get();
      try {
        this.interactions?.checkForSupportedActions(supportedActions);
        this.interactions?.checkForSupportedReactions([]);
        this.interactions?.checkForSupportedWatches([]);
      } catch (err: unknown) {
        appCore.err(err);
      }
      this.dataSeries?.dataSeriesQuery?.response
          .pipe(takeUntil(this.unsubscribe))
          .subscribe((response) => {
            try {
              this.interactions?.update(
                  RESPONSE_PROPERTIES, UPDATE, response.properties);
            } catch (err: unknown) {
              appCore.err(err);
            }
          });
    });
  }
}
