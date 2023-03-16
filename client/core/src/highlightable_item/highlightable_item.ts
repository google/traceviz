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

import {ResponseNode} from '../protocol/response_interface.js';
import {MatchFn} from '../interactions/interactions.js';
import {ValueMap} from '../value/value_map.js';
import {Subject} from 'rxjs';
import {distinctUntilChanged, takeUntil} from 'rxjs/operators';

/** A ResponseNode capable of being highlighted or called-out in the UI. */
export class HighlightableItem implements ResponseNode {
  readonly highlightUnsubscribe = new Subject<void>();
  readonly properties: ValueMap;
  readonly children: HighlightableItem[] = [];
  highlighted: boolean = false;

  constructor(
      node: ResponseNode,
      childFn: (node: ResponseNode) => HighlightableItem |
          undefined = (node) => new HighlightableItem(node)) {
    this.properties = node.properties;
    for (const childNode of node.children) {
      const child = childFn(childNode);
      if (child) {
        this.children.push(child);
      }
    }
  }

  highlightOn(
      getMatch: (item: HighlightableItem) => MatchFn | undefined,
      onChange: (item: HighlightableItem) => void = () => {}) {
    const match = getMatch(this);
    if (match) {
      match(this.properties)
          .pipe(takeUntil(this.highlightUnsubscribe), distinctUntilChanged())
          .subscribe((matched) => {
            this.highlighted = matched;
            onChange(this);
          });
    }
    for (const child of this.children) {
      child.highlightOn(getMatch, onChange);
    }
  }

  dispose() {
    this.highlightUnsubscribe.next();
    this.highlightUnsubscribe.complete();
  }
}
