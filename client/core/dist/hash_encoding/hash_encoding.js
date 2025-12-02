/*
        Copyright 2023 Google Inc.
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
                https://www.apache.org/licenses/LICENSE-2.0
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
*/
/**
 * @fileoverview Utilities for serializing state to, and unserializing state
 * from, the URL hash, as well as for compressing and uncompressing objects
 * in a URL-encodeable way.
 */
import { Buffer } from 'buffer';
import { deflate, inflate } from 'pako';
/**
 * Stringifies the provided object, deflates it, and encodes the deflated string
 * in base64, returning the URLencoded result.
 */
export function compress(obj) {
    const uncompressedStr = JSON.stringify(obj);
    const uncompressedBytes = new TextEncoder().encode(uncompressedStr);
    const compressedBytes = deflate(uncompressedBytes);
    const compressedStr = Array.from(compressedBytes).map((b) => String.fromCharCode(b)).join('');
    const b64EncodedStr = Buffer.from(compressedStr, 'utf-8').toString('base64');
    const urlEncodedStr = encodeURIComponent(b64EncodedStr);
    return urlEncodedStr;
}
/**
 * Decompresses a URL-encoded, base64-encoded, deflated JSON string, returning
 * the decompressed value.
 */
export function decompress(compressed) {
    let b64EncodedStr = decodeURIComponent(compressed);
    const compressedStr = Buffer.from(b64EncodedStr, 'base64').toString('utf-8');
    const compressedBytes = Uint8Array.from(compressedStr.split('').map((c) => c.charCodeAt(0)));
    const uncompressedBytes = inflate(compressedBytes);
    const uncompressedStr = new TextDecoder().decode(uncompressedBytes);
    return JSON.parse(uncompressedStr);
}
/**
 * Deserializes a URL hash fragment into a string key/string value map.
 */
export function unserializeHashFragment(hashFragment) {
    const ret = {};
    const hashRegex = /[#&]([^#=&\s]+(?:=[^#=&\s]+)?)/g;
    const matches = hashFragment.match(hashRegex);
    if (matches?.length) {
        for (const match of matches) {
            if (!match) {
                continue;
            }
            const [key, value] = match.slice(1).split('=', 2).map(decodeURIComponent);
            ret[key] = value ?? '';
        }
    }
    return ret;
}
/**
 * Serializes a string key/string value map into a hash fragment.
 */
export function serializeHashFragment(hashMap) {
    // Sort keys to ensure that the hash doesn't change too drastically.
    const keys = Object.keys(hashMap).map(encodeURIComponent).sort();
    return !keys.length ?
        '' :
        `#${keys.map((k) => hashMap[k] ? `${k}=${encodeURIComponent(hashMap[k])}` : k)
            .join('&')}`;
}
//# sourceMappingURL=hash_encoding.js.map