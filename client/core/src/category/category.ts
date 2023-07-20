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

import {ConfigurationError, Severity} from '../errors/errors.js';
import {ValueMap} from '../value/value_map.js';

const SOURCE = 'categories';

const CATEGORY_DEFINED_ID = 'category_defined_id';
const CATEGORY_DESCRIPTION = 'category_description';
const CATEGORY_DISPLAY_NAME = 'category_display_name';
const CATEGORY_IDS = 'category_ids';

/** The set of properties used to define a category. */
export const categoryProperties: readonly string[] = [
  CATEGORY_DEFINED_ID, CATEGORY_DISPLAY_NAME, CATEGORY_DESCRIPTION, CATEGORY_IDS
];


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
export function getDefinedCategory(properties: ValueMap): Category|undefined {
  if (properties.has(CATEGORY_DEFINED_ID)) {
    return {
      id: properties.expectString(CATEGORY_DEFINED_ID),
      displayName: properties.expectString(CATEGORY_DISPLAY_NAME),
      description: properties.expectString(CATEGORY_DESCRIPTION),
    };
  }
  return undefined;
}

/** A set of Categories with which data may be tagged. */
export class CategorySet {
  private readonly categoriesByID: ReadonlyMap<string, Category>;

  constructor(...categories: Category[]) {
    const catMap = new Map<string, Category>([]);
    for (const category of categories) {
      catMap.set(category.id, category);
    }
    this.categoriesByID = catMap;
  }

  getTaggedCategories(properties: ValueMap): Category[] {
    const ret = new Array<Category>();
    if (!properties.has(CATEGORY_IDS)) {
      return [];
    }
    for (const categoryID of properties.expectStringList(CATEGORY_IDS)) {
      const category = this.categoriesByID.get(categoryID);
      if (!category) {
        throw new ConfigurationError(
            `tagged category '${
                categoryID}' is not defined in this CategorySet`)
            .from(SOURCE)
            .at(Severity.ERROR);
      }
      ret.push(category);
    }
    return ret;
  }
}

/** Returns true iff categories a and b are equal in all fields. */
export function categoryEquals(a: Category, b: Category): boolean {
  return a.id === b.id && a.displayName === b.displayName &&
      a.description === b.description;
}
