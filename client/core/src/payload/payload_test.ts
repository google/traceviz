
import { node } from "../protocol/test_response.js";
import { ResponseNode } from "../protocol/response_interface.js";
import { children } from './payload.js';
import { int, str, valueMap } from "../value/test_value.js";

describe('payload test', () => {
  it('extracts payloads and children', () => {
    const n = node(
        valueMap(),
        node(valueMap(
            {key: 'index', val: int(1)},
            )),
        node(valueMap(
            {key: 'payload_type', val: str('detail')},
            {key: 'name', val: str('egg')},
            )),
        node(valueMap(
            {key: 'index', val: int(2)},
            )),
        node(valueMap(
            {key: 'payload_type', val: str('stats')},
            {key: 'mean', val: int(4)},
            )),
        node(valueMap(
            {key: 'payload_type', val: str('detail')},
            {key: 'color', val: str('brown')},
            )),
        node(valueMap(
            {key: 'index', val: int(3)},
            )),
    );
    expect(children(n)).toEqual({
      structural: [
        node(valueMap(
            {key: 'index', val: int(1)},
            )),
        node(valueMap(
            {key: 'index', val: int(2)},
            )),
        node(valueMap(
            {key: 'index', val: int(3)},
            )),
      ],
      payload: new Map<string, ResponseNode[]>([
        [
          'detail',
          [
            node(valueMap(
                {key: 'payload_type', val: str('detail')},
                {key: 'name', val: str('egg')},
                )),
            node(valueMap(
                {key: 'payload_type', val: str('detail')},
                {key: 'color', val: str('brown')},
                )),
          ],
        ],
        [
          'stats',
          [
            node(valueMap(
                {key: 'payload_type', val: str('stats')},
                {key: 'mean', val: int(4)},
                )),
          ]
        ]
      ]),
    });
  });
});