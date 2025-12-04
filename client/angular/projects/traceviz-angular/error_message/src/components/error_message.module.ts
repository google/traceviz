import {NgModule} from '@angular/core';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {BrowserModule} from '@angular/platform-browser';

import {ErrorMessage} from './error_message.component';

@NgModule({
  declarations: [
    ErrorMessage,
  ],
  imports: [
    BrowserModule,
    MatSnackBarModule,
  ],
  exports: [
    ErrorMessage,
  ],
})
export class ErrorMessageModule {
}
