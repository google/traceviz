import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { AppCoreService } from 'projects/ngx-traceviz/src/app_core_service/app_core.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [AppCoreService],
  bootstrap: [AppComponent]
})
export class AppModule { }
