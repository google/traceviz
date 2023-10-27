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

const {relative, resolve} = require('node:path');
const {readdir, readFile, writeFile} = require('node:fs/promises');

const distFolder = resolve(__dirname, '../dist/');

async function fixupImportFileExtensions() {
  const filePaths = [];

  const replaceExtension = (filepath, source) => {
    const pathPrefix = relative(filepath, distFolder);
    return source
      .replace(/(^import.*from ['|"])(traceviz-angular-.*['|"]);$/gm, `$1${pathPrefix}/../angular/dist/$2`)
      .replace(/(^import.*from ['|"])(traceviz-client-core)(['|"]);$/gm, `$1${pathPrefix}/../core$3`);
  }

  const recursiveReadDir = async path => {
    const dirResults = await readdir(path, {withFileTypes: true});
    for (const entry of dirResults) {
      const p = resolve(entry.path, entry.name);
      if (entry.isDirectory()) {
        await recursiveReadDir(p);
      } else if (p.endsWith('.mjs') || p.endsWith('.d.ts')) {
        filePaths.push(p);
      }
    }
  };
  await recursiveReadDir(distFolder);
  for (const filepath of filePaths) {
    const contents = await readFile(filepath, { encoding: 'utf8' });
    await writeFile(filepath, replaceExtension(filepath, contents));
  }
}

async function main() {
  await fixupImportFileExtensions();
}

main();

