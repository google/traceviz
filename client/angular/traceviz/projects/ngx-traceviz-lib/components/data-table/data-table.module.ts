import { NgModule } from "@angular/core";
import { DataTableComponent } from "./data-table.component";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSortModule } from "@angular/material/sort";
import { CommonModule } from "@angular/common";

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