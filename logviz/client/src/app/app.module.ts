import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatPaginatorModule} from '@angular/material/paginator';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AxesModule} from 'traceviz-angular-axes';
import {CoreModule} from 'traceviz-angular-core';
import {DataTableModule} from 'traceviz-angular-data-table';
import {ErrorMessageModule} from 'traceviz-angular-error-message';
import {HovercardModule} from 'traceviz-angular-hovercard';
import {LineChartModule} from 'traceviz-angular-line-chart';
import {TextFieldModule} from 'traceviz-angular-text-field';

import {AppComponent} from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    AxesModule,
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    DataTableModule,
    ErrorMessageModule,
    HttpClientModule,
    HovercardModule,
    LineChartModule,
    MatCardModule,
    MatPaginatorModule,
    TextFieldModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
