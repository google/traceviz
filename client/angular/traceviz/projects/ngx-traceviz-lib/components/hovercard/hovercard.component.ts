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

import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, Inject, Input } from '@angular/core';

/** Provides a box that appears on top near the mouse cursor */
@Component({
  selector: 'hovercard',
  template: `
    <ng-content *ngIf="visible"></ng-content>
  `,
  styles: [`
    :host {
      position: fixed;
      background: rgba(97,97,97,.9);
      color: #ffffff;
      border-radius: 4px;
      max-width: 250px;
      overflow-wrap: break-word;
      padding: 8px;
      white-space: pre-line;
    }
    :host:empty {
      display: none;
    }
  `],
})
export class HovercardComponent {
  @Input() visible = false;

  constructor(
    readonly element: ElementRef,
    @Inject(DOCUMENT) readonly document: Document) { }

  @HostListener('window:mousemove', ['$event'])
  updatePosition(event: MouseEvent) {
    const host = this.element.nativeElement;
    host.style.top = `${this.computeTopPosition(event.clientY)}px`;
    host.style.left = `${this.computeLeftPosition(event.clientX)}px`;
  }

  computeTopPosition(cursorY: number): number {
    const tooltipBounds: DOMRect = this.element.nativeElement.getBoundingClientRect();
    const windowBounds: DOMRect = this.document.body.getBoundingClientRect();

    // Normally the top border of the tooltip will be offset slightly below
    // the cursor to add some visual space
    const offsetY = 10;

    // If the tooltip can be placed below the cursor, place it there
    const topPosWhenBelow = cursorY + offsetY;
    const fitsBelow =
      (topPosWhenBelow + tooltipBounds.height <= windowBounds.height);
    if (fitsBelow) {
      return topPosWhenBelow;
    }

    // If it doesn't fit in the normal position, but it fits within the
    // container, then align the bottom of the tooltip with the bottom of the
    // container, i.e. place it as low as possible
    if (windowBounds.height > tooltipBounds.height) {
      return windowBounds.height - tooltipBounds.height;
    }

    // If it doesn't fit in the container at all place it at the top, this will
    // cause the bottom to be cropped
    return 0;
  }

  computeLeftPosition(cursorX: number): number {
    const tooltipBounds: DOMRect = this.element.nativeElement.getBoundingClientRect();
    const windowBounds: DOMRect = this.document.body.getBoundingClientRect();

    // Normally the left border of the tooltip will be offset slightly to the
    // right of the cursor to avoid being obscured by it. Conversely if the
    // tooltip only fits left the cursor, the right border will be offset
    // slightly left of the cursor
    const offsetX = 10;

    // Prefer putting the tooltip on the right. If it doesn't fit there but fits
    // on the left, put it on the left
    const leftPosWhenOnRight = cursorX + offsetX;
    const leftPosWhenOnLeft = cursorX - offsetX - tooltipBounds.width;

    const fitsRight =
      leftPosWhenOnRight + tooltipBounds.width <= windowBounds.width;

    if (!fitsRight) {
      return leftPosWhenOnLeft;
    }
    return leftPosWhenOnRight;
  }
}
