/*
        Copyright 2025 Google Inc.
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

import {deflate, inflate} from 'pako';
import 'google-closure-library/closure/goog/crypt/crypt.js';

/**
 * Stringifies the provided object, deflates it, and encodes the deflated string
 * in base64, returning the encoded result.  If JSON stringification fails,
 * returns an empty string.
 * @param obj The object to encode and compress
 * @return The url-encoded, base64-encoded, zlib-compressed JSON string
 *     containing obj.
 */
export function compress(obj: object): string {
  let str = '';
  try {
    str = JSON.stringify(obj);
  } catch (e) {
    return str;
  }
  const data = goog.crypt.stringToUtf8ByteArray(str);
  const compressedStr = deflate(data);
  return encodeURIComponent(goog.crypt.encodeByteArray(compressedStr));
}

/**
 * Takes in a URL-encoded, base64-encoded, zlib-compressed JSON
 * string and returns the uncompressed value.
 *
 * @template T The type that should be decompressed into.
 *     Must be a type representable in JSON.
 *     The decompressed JSON will be blindly cast to this type.
 * @param compressed The url-encoded, base64-encoded, zlib-compressed JSON
 *     string to decompress.
 * @return The decompressed object or undefined if an error occurred.
 */
export function decompress<T = never>(compressed: string): T|undefined {
  // Call decodeURIComponent() until stable.
  let decoded = decodeURIComponent(compressed);
  let tries = 0;
  while ((decoded !== (decoded = decodeURIComponent(decoded))) &&
         (tries < 10)) {
    tries++;
  }

  const bytes = goog.crypt.decodeStringToByteArray(decoded);
  try {
    const stringified = goog.crypt.utf8ByteArrayToString(inflate(bytes));
    return JSON.parse(stringified) as T;
  } catch {
    // Do nothing
  }
  return;
}

/**
 * Parses a hash fragment into a string key/string value map.
 *
 * @param hash The location hash string to parse
 * @return A map from hash key to hash value(s).
 */
export function parseHashFragment(hash: string): {[k: string]: string} {
  const ret: {[k: string]: string} = {};
  const hashRegex = /[#&]([^#=&\s]+(?:=[^#=&\s]+)?)/g;
  const matches = hash.match(hashRegex);
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
 * Serializes a string key/string value map into a hash
 * fragment.
 *
 * @param hashMap A map from hash key to hash value(s).
 * @return A location hash string
 */
export function serializeHashFragment(hashMap: {[k: string]: string}): string {
  // Sort keys to ensure that the hash doesn't change too drastically
  const keys = Object.keys(hashMap).map(encodeURIComponent).sort();
  return !keys.length ?
      '' :
      `#${keys.map((k) => hashMap[k] ? 
              `${k}=${encodeURIComponent(hashMap[k])}` : k)
          .join('&')}`;
}