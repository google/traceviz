import {Component} from '@angular/core';

import {AppCoreService} from 'traceviz-angular-core';

/** The application component of the LogViz client. */
@Component({
  selector: 'logviz',
  templateUrl: './logviz.component.html',
  styleUrls: ['logviz.component.css'],
})
export class LogvizComponent {
  constructor(public appCoreService: AppCoreService) {
  }
}