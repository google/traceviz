import { NgModule } from "@angular/core";
import { UpdateValuesDirective } from "./update-values.component";
import { CommonModule } from "@angular/common";

@NgModule({
    declarations: [
        UpdateValuesDirective,
    ],
    imports: [
        CommonModule,
    ],
    exports: [
        UpdateValuesDirective,
    ],
})
export class UpdateValuesModule {
}