/**
 * @fileoverview A component enabling interactions on user keypress events.
 */

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

import {AfterContentInit, ChangeDetectionStrategy, Component, ContentChild, HostListener} from '@angular/core';
import {AppCoreService, InteractionsDirective} from '@traceviz/angular/core';
import {Interactions, StringSetValue, ValueMap} from '@traceviz/client-core';

const DEPRESSED_KEY_CODES = 'depressed_key_codes';

const KEY = 'key';
const PRESS = 'press';

const SUPPORTED_ACTIONS = new Array<[string, string]>(
    [KEY, PRESS],
);

const SUPPORTED_REACTIONS = new Array<[string, string]>();

const SUPPORTED_WATCHES = new Array<string>();

/**
 * Presents a view of trace data in which the x-axis is trace time and spans
 * extend horizontally, with trace categories on the y-axis.
 */
@Component({
  selector: 'keypress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class KeypressComponent implements AfterContentInit {
  @ContentChild(InteractionsDirective, {descendants: false})
  interactionsDir: InteractionsDirective|undefined;

  private interactions: Interactions|undefined;
  private static readonly depressedKeyCodesSet = new Set<string>([]);
  private readonly depressedKeyCodesVal = new StringSetValue(new Set([]));

  private readonly localState = new ValueMap(new Map([
    [DEPRESSED_KEY_CODES, this.depressedKeyCodesVal],
  ]));

  constructor(private readonly appCoreService: AppCoreService) {}

  ngAfterContentInit() {
    this.appCoreService.appCore.onPublish((appCore) => {
      this.interactions = this.interactionsDir?.get();
      try {
        this.interactions?.checkForSupportedActions(SUPPORTED_ACTIONS);
        this.interactions?.checkForSupportedReactions(SUPPORTED_REACTIONS);
        this.interactions?.checkForSupportedWatches(SUPPORTED_WATCHES);
      } catch (err) {
        appCore.err(err);
      }
    });
  }

  @HostListener('window:keydown', ['$event'])
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.type === 'keydown') {
      KeypressComponent.depressedKeyCodesSet.add(event.code);
    } else {
      KeypressComponent.depressedKeyCodesSet.delete(event.code);
    }
    this.depressedKeyCodesVal.val = KeypressComponent.depressedKeyCodesSet;
    this.interactions?.update(KEY, PRESS, this.localState);
  }
}
