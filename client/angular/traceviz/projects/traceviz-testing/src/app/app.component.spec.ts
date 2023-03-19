import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, ViewChild } from '@angular/core';

import { IntLiteralDirective, IntLiteralListDirective, StringLiteralDirective, StringLiteralListDirective, StringLiteralSetDirective, ValueModule } from 'ngx-traceviz';
import { StringValue, StringListValue, StringSetValue, IntegerValue, IntegerListValue } from 'traceviz-client-core';
import { By } from '@angular/platform-browser';

// @Component({
//   template: `
//     <string>hello</string>
// `
// })
// class TestComponent {
//   @ViewChild(StringLiteralDirective) strLitDir!: StringLiteralDirective;
// }

// describe('value directives test', () => {
//   let fixture: ComponentFixture<TestComponent>;

//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       declarations: [TestComponent],
//       imports: [ValueModule],
//     })
//     fixture = TestBed.createComponent(TestComponent);
//   });

//   it('creates literal Values', () => {
//     fixture.detectChanges();
//     const tc = fixture.componentInstance;
//     const strLitDir = tc.strLitDir;
//     expect((tc.strLitDir.get(undefined) as StringValue).val).toEqual('hello');
//   });
// });

@Component({
  template: `
    <string>hello</string>
    <string-list>
      <string>a</string>
      <string>b</string>
    </string-list>
    <string-set>
      <string>c</string> 
      <string>d</string>
    </string-set>
    <int>3</int>
    <int-list>
      <int>1</int>
      <int>2</int>
    </int-list>
`
})
class TestComponent {
  @ViewChild(StringLiteralDirective) strLitDir!: StringLiteralDirective;
  @ViewChild(StringLiteralListDirective) strLitListDir!: StringLiteralListDirective;
  @ViewChild(StringLiteralSetDirective) strLitSetDir!: StringLiteralSetDirective;
  @ViewChild(IntLiteralDirective) intLitDir!: IntLiteralDirective;
  @ViewChild(IntLiteralListDirective) intLitListDir!: IntLiteralListDirective;
}

describe('value directives test', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TestComponent],
      imports: [ValueModule],
    })
    fixture = TestBed.createComponent(TestComponent);
  });

  it('creates literal Values', () => {
    fixture.detectChanges();
    const tc = fixture.componentInstance;
    const strLitDir = tc.strLitDir;
    expect((tc.strLitDir.get(undefined) as StringValue).val).toEqual('hello');
    expect((tc.strLitListDir.get(undefined) as StringListValue).val).toEqual(['a', 'b']);
    expect((tc.strLitSetDir.get(undefined) as StringSetValue).val).toEqual(new Set(['c', 'd']));
    expect((tc.intLitDir.get(undefined) as IntegerValue).val).toEqual(3);
    expect((tc.intLitListDir.get(undefined) as IntegerListValue).val).toEqual([1, 2]);
  });
});
