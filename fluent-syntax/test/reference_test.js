import assert from 'assert';
import { join } from 'path';
import { readdir } from 'fs';
import { readfile } from './util';

import { parse } from '../src';

const fixtures = join(__dirname, 'fixtures_reference');

function erase_annotations(ast) {
  if (typeof ast === "object") {
    for (let key in ast) {
      if (key === "annotations") {
        ast[key] = [];
      } else {
        erase_annotations(ast[key]);
      }
    }
  } else if (Array.isArray(ast)) {
    for (let i of ast) {
      erase_annotations(ast[i]);
    }
  } else {
    return;
  }
}

readdir(fixtures, function(err, filenames) {
  if (err) {
    throw err;
  }

  const ftlnames = filenames.filter(
    filename => filename.endsWith('.ftl')
  );

  suite('Structure tests', function() {
    for (const filename of ftlnames) {
      const ftlpath = join(fixtures, filename);
      const astpath = ftlpath.replace(/ftl$/, 'json');
      test(filename, function() {
        return Promise.all(
          [ftlpath, astpath].map(readfile)
        ).then(([ftl, expected]) => {
          const ast = parse(ftl, {
            withSpans: false
          });
          erase_annotations(ast);
          console.log(JSON.stringify(ast));
          console.log(expected);
          assert.deepEqual(
            ast, JSON.parse(expected),
            'Parsed AST doesn\'t match the expected one'
          );
        });
      });
      break;
    }
  });
});
