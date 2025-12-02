/**
 * Stringifies the provided object, deflates it, and encodes the deflated string
 * in base64, returning the URLencoded result.
 */
export declare function compress(obj: object): string;
/**
 * Decompresses a URL-encoded, base64-encoded, deflated JSON string, returning
 * the decompressed value.
 */
export declare function decompress<T = never>(compressed: string): T | undefined;
/**
 * Deserializes a URL hash fragment into a string key/string value map.
 */
export declare function unserializeHashFragment(hashFragment: string): {
    [k: string]: string;
};
/**
 * Serializes a string key/string value map into a hash fragment.
 */
export declare function serializeHashFragment(hashMap: {
    [k: string]: string;
}): string;
