import { TestBed } from '@angular/core/testing';

import { NgxTracevizService } from './ngx-traceviz.service';

describe('NgxTracevizService', () => {
  let service: NgxTracevizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NgxTracevizService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
