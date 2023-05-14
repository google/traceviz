import { NgModule } from "@angular/core";
import { TextFieldComponent } from "./text-field.component";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from '@angular/material/input';

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