import { ValueMap } from '../value/value_map.js';
/** The set of properties used to define a category. */
export declare const categoryProperties: readonly string[];
/** A category, representing a graphical grouping of data. */
export interface Category {
    id: string;
    displayName: string;
    description: string;
}
/**
 * Returns the Category defined in the provided properties, or undefined if no
 * Category is defined there.
 */
export declare function getDefinedCategory(properties: ValueMap): Category | undefined;
/** A set of Categories with which data may be tagged. */
export declare class CategorySet {
    private readonly categoriesByID;
    constructor(...categories: Category[]);
    getTaggedCategories(properties: ValueMap): Category[];
}
/** Returns true iff categories a and b are equal in all fields. */
export declare function categoryEquals(a: Category, b: Category): boolean;
