import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CoreModule} from 'traceviz-angular-core';
import {DataTableModule} from 'traceviz-angular-data-table';

import {AppComponent} from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule, BrowserAnimationsModule, CoreModule, DataTableModule,
    HttpClientModule, MatCardModule, MatPaginatorModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
