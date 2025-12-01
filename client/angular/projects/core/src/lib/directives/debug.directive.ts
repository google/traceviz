/*
        Copyright 2025 Google Inc.
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
import {ConfigurationError, Severity, ValueMap} from '@google/traceviz-client-core';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

import {AppCoreService} from '../services/app_core.service';

import {InteractionsDirective} from './interactions.directive';

const SOURCE = 'debug.directive';

const DEBUG = 'debug';
const BREAK = 'break';
const LOG = 'log';

const supportedReactions = new Array<[string, string]>(
    [DEBUG, BREAK]  // A debugger breakpoint is invoked.
);

const supportedWatches = [LOG];

@Directive({standalone: false, selector: 'debug'})
export class DebugDirective implements AfterContentInit, OnDestroy {
  @ContentChild(InteractionsDirective) interactions?: InteractionsDirective;
  private readonly unsubscribe = new Subject<void>();

  constructor(private readonly appCoreService: AppCoreService) {}

  /**
   * Disable the 'debug statement is present' checker.
   * @suppress {checkDebuggerStatement}
   */
  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      try {
        if (this.interactions === undefined) {
          throw new ConfigurationError(
              `debug is missing required 'interactions' child.`)
              .from(SOURCE)
              .at(Severity.ERROR);
        }
        const interactions = this.interactions.get();
        interactions.checkForSupportedActions([]);
        interactions.checkForSupportedReactions(supportedReactions);
        interactions.checkForSupportedWatches(supportedWatches);

        interactions.watch(LOG, (vm: ValueMap) => {
          console.log(`TraceViz debug log:`);
          for (const [key, val] of vm.entries()) {
            console.log(`  ${key}: ${val.toString()}`);
          }
        }, this.unsubscribe);
        interactions.match(DEBUG, BREAK)()
            .pipe(takeUntil(this.unsubscribe))
            .subscribe((match: boolean) => {
              if (match) {
                // The point of this directive is to get a debugger:
                // tslint:disable:no-debugger
                debugger;
                // tslint:enable:no-debugger
              }
            });
      } catch (err: unknown) {
        appCore.err(err);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }
}
