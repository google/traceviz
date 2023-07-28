import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';

import {TextFieldComponent} from './components/text_field.component';

@NgModule({
  declarations: [
    TextFieldComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
  ],
  exports: [
    TextFieldComponent,
  ],
})
export class TextFieldModule {
}
