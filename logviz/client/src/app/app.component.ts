import { Component } from '@angular/core';

import { AppCoreService } from 'traceviz/dist/ngx-traceviz-lib';

/** The application component of the LogViz client. */
@Component({
  selector: 'logviz',
  templateUrl: './app.component.html',
  styleUrls: ['app.component.css'],
})
export class AppComponent {
  constructor(public appCoreService: AppCoreService) {
    appCoreService.appCore.onPublish((appCore) => {
      console.log('published!');
    });
  }
}