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

import { NgModule } from '@angular/core';

import { DblLiteralDirective, DurationLiteralDirective, EmptyLiteralDirective, IntLiteralDirective, IntLiteralListDirective, IntLiteralSetDirective, StringLiteralDirective, StringLiteralListDirective, StringLiteralSetDirective, TimestampLiteralDirective } from './literal_value.directive';
import { ValueMapDirective, ValueWrapperDirective } from './value_map.directive';
import { GlobalStateDirective } from './global_state.directive';
import { GlobalRefDirective } from './global_ref.directive';
import { AppCoreDirective } from './app_core.directive';
import { LocalRefDirective } from './local_ref.directive';
import { ActionDirective, AndDirective, ChangedDirective, ClearDirective, EqualsDirective, ExtendDirective, GreaterThanDirective, IncludesDirective, InteractionsDirective, LessThanDirective, NotDirective, OrDirective, ReactionDirective, SetDirective, SetIfEmptyDirective, ToggleDirective, SetOrClearDirective, WatchDirective } from './interactions.directive';
import { DataQueryDirective } from './data_query.directive';
import { DataSeriesQueryDirective, ParametersDirective, QueryDirective } from './data_series_query.directive';

@NgModule({
    declarations: [
        ActionDirective,
        AndDirective,
        AppCoreDirective,
        ClearDirective,
        ChangedDirective,
        DataQueryDirective,
        DataSeriesQueryDirective,
        DblLiteralDirective,
        DurationLiteralDirective,
        EmptyLiteralDirective,
        EqualsDirective,
        ExtendDirective,
        GlobalRefDirective,
        GlobalStateDirective,
        GreaterThanDirective,
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
        QueryDirective,
        SetDirective,
        SetIfEmptyDirective,
        StringLiteralDirective,
        StringLiteralListDirective,
        StringLiteralSetDirective,
        TimestampLiteralDirective,
        ToggleDirective,
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
        ClearDirective,
        ChangedDirective,
        DataQueryDirective,
        DataSeriesQueryDirective,
        DblLiteralDirective,
        DurationLiteralDirective,
        EmptyLiteralDirective,
        EqualsDirective,
        ExtendDirective,
        GlobalRefDirective,
        GlobalStateDirective,
        GreaterThanDirective,
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
        QueryDirective,
        SetDirective,
        SetIfEmptyDirective,
        StringLiteralDirective,
        StringLiteralListDirective,
        StringLiteralSetDirective,
        TimestampLiteralDirective,
        ToggleDirective,
        SetOrClearDirective,
        ReactionDirective,
        ValueMapDirective,
        ValueWrapperDirective,
        WatchDirective,
    ],
})
export class CoreModule {
}
