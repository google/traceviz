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

import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {BrowserModule} from '@angular/platform-browser';
import {CoreModule} from '@google/traceviz-angular-core';
import {HovercardModule} from '@google/traceviz-angular-hovercard';

import {HorizontalTraceComponent, VerticalRuleColorDirective} from './components/horizontal_trace.component';
import {TraceDirective, UnionTracesDirective} from './directives/trace_provider.directive';

@NgModule({
  declarations: [
    HorizontalTraceComponent,
    TraceDirective,
    UnionTracesDirective,
    VerticalRuleColorDirective,
  ],
  imports: [
    BrowserModule,
    CoreModule,
    MatButtonModule,
    MatProgressBarModule,
    HovercardModule,
  ],
  exports: [
    HorizontalTraceComponent,
    TraceDirective,
    UnionTracesDirective,
    VerticalRuleColorDirective,
  ],
})
export class TraceModule {
}
