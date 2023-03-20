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

@NgModule({
    declarations: [
        AppCoreDirective,
        DblLiteralDirective,
        DurationLiteralDirective,
        EmptyLiteralDirective,
        GlobalRefDirective,
        GlobalStateDirective,
        IntLiteralDirective,
        IntLiteralListDirective,
        IntLiteralSetDirective,
        LocalRefDirective,
        StringLiteralDirective,
        StringLiteralListDirective,
        StringLiteralSetDirective,
        TimestampLiteralDirective,
        ValueMapDirective,
        ValueWrapperDirective
    ],
    imports: [],
    exports: [
        AppCoreDirective,
        DblLiteralDirective,
        DurationLiteralDirective,
        EmptyLiteralDirective,
        GlobalRefDirective,
        GlobalStateDirective,
        IntLiteralDirective,
        IntLiteralListDirective,
        IntLiteralSetDirective,
        LocalRefDirective,
        StringLiteralDirective,
        StringLiteralListDirective,
        StringLiteralSetDirective,
        TimestampLiteralDirective,
        ValueMapDirective,
        ValueWrapperDirective
    ],
})
export class CoreModule {
}
