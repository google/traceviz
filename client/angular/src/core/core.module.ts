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

import {AppCoreDirective} from './directives/app_core.directive';
import {DataQueryDirective} from './directives/data_query.directive';
import {DataSeriesDirective, ParametersDirective, QueryDirective} from './directives/data_series_query.directive';
import {DebugDirective} from './directives/debug.directive';
import {GlobalRefDirective} from './directives/global_ref.directive';
import {GlobalStateDirective} from './directives/global_state.directive';
import {ActionDirective, AndDirective, CaseDirective, ChangedDirective, ClearDirective, ConcatDirective, ElseDirective, EqualsDirective, ExtendDirective, FalseDirective, GreaterThanDirective, IfDirective, IncludesDirective, InteractionsDirective, LessThanDirective, NotDirective, OrDirective, PopLeftDirective, PrefixOfDirective, PushLeftDirective, ReactionDirective, SetDirective, SetIfEmptyDirective, SetOrClearDirective, SwapDirective, SwitchDirective, ThenDirective, ToggleDirective, TrueDirective, WatchDirective} from './directives/interactions.directive';
import {DblLiteralDirective, DurationLiteralDirective, EmptyLiteralDirective, IntLiteralDirective, IntLiteralListDirective, IntLiteralSetDirective, StringLiteralDirective, StringLiteralListDirective, StringLiteralSetDirective, TimestampLiteralDirective} from './directives/literal_value.directive';
import {LocalRefDirective} from './directives/local_ref.directive';
import {ValueMapDirective, ValueWrapperDirective} from './directives/value_map.directive';

@NgModule({
  declarations: [
    ActionDirective,
    AndDirective,
    AppCoreDirective,
    CaseDirective,
    ClearDirective,
    ChangedDirective,
    ConcatDirective,
    DataQueryDirective,
    DataSeriesDirective,
    DblLiteralDirective,
    DebugDirective,
    DurationLiteralDirective,
    ElseDirective,
    EmptyLiteralDirective,
    EqualsDirective,
    ExtendDirective,
    FalseDirective,
    GlobalRefDirective,
    GlobalStateDirective,
    GreaterThanDirective,
    IfDirective,
    IncludesDirective,
    InteractionsDirective,
    IntLiteralDirective,
    IntLiteralListDirective,
    IntLiteralSetDirective,
    LessThanDirective,
    LocalRefDirective,
    OrDirective,
    NotDirective,
    ParametersDirective,
    PopLeftDirective,
    PrefixOfDirective,
    PushLeftDirective,
    QueryDirective,
    SetDirective,
    SetIfEmptyDirective,
    StringLiteralDirective,
    StringLiteralListDirective,
    StringLiteralSetDirective,
    SwapDirective,
    SwitchDirective,
    ThenDirective,
    TimestampLiteralDirective,
    ToggleDirective,
    TrueDirective,
    SetOrClearDirective,
    ReactionDirective,
    ValueMapDirective,
    ValueWrapperDirective,
    WatchDirective,
  ],
  imports: [],
  exports: [
    ActionDirective,
    AndDirective,
    AppCoreDirective,
    CaseDirective,
    ClearDirective,
    ChangedDirective,
    ConcatDirective,
    DataQueryDirective,
    DataSeriesDirective,
    DblLiteralDirective,
    DebugDirective,
    DurationLiteralDirective,
    ElseDirective,
    EmptyLiteralDirective,
    EqualsDirective,
    ExtendDirective,
    FalseDirective,
    GlobalRefDirective,
    GlobalStateDirective,
    GreaterThanDirective,
    IfDirective,
    IncludesDirective,
    InteractionsDirective,
    IntLiteralDirective,
    IntLiteralListDirective,
    IntLiteralSetDirective,
    LessThanDirective,
    LocalRefDirective,
    OrDirective,
    NotDirective,
    ParametersDirective,
    PopLeftDirective,
    PrefixOfDirective,
    PushLeftDirective,
    QueryDirective,
    SetDirective,
    SetIfEmptyDirective,
    StringLiteralDirective,
    StringLiteralListDirective,
    StringLiteralSetDirective,
    SwapDirective,
    SwitchDirective,
    ThenDirective,
    TimestampLiteralDirective,
    ToggleDirective,
    TrueDirective,
    SetOrClearDirective,
    ReactionDirective,
    ValueMapDirective,
    ValueWrapperDirective,
    WatchDirective,
  ],
})
export class CoreModule {
}