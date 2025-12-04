import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSelectModule} from '@angular/material/select';
import {MatSortModule} from '@angular/material/sort';
import {BrowserModule} from '@angular/platform-browser';

import {DataTable} from './data_table.component';

@NgModule({
  declarations: [
    DataTable,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSortModule,
  ],
  exports: [
    DataTable,
  ],
})
export class DataTableModule {
}
