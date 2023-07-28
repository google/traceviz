import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSortModule} from '@angular/material/sort';

import {DataTableComponent} from './components/data_table.component';

@NgModule({
  declarations: [
    DataTableComponent,
  ],
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatSortModule,
  ],
  exports: [
    DataTableComponent,
  ],
})
export class DataTableModule {
}
