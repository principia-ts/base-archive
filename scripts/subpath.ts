import chalk from 'chalk'
import { parseJSON } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import path from 'path'

import { glob, onLeft, onRight, readFile, writeFile } from './common'

const packageJsonPath = path.resolve(process.cwd(), 'package.json')

pipe(
  glob('src/**/index.*'),
  TE.map(
    A.reduce({}, (b, path) => {
      const base            = path.split('/').slice(1)
      base[base.length - 1] = 'index.js'
      const basePath        = ['.', ...base.slice(0, -1)].join('/')
      const esm             = ['.', 'dist', 'dist', 'esm', ...base].join('/')
      const cjs             = ['.', 'dist', 'dist', 'cjs', ...base].join('/')
      const node            = ['.', 'dist', 'dist', 'node', ...base].join('/')
      const esm_traced      = ['.', 'dist', 'dist-traced', 'esm', ...base].join('/')
      const cjs_traced      = ['.', 'dist', 'dist-traced', 'cjs', ...base].join('/')
      const node_traced     = ['.', 'dist', 'dist-traced', 'node', ...base].join('/')
      return {
        ...b,
        [basePath]: {
          traced: {
            browser: esm_traced,
            node: {
              import: node_traced,
              require: cjs_traced
            }
          },
          node: {
            import: node,
            require: cjs
          },
          browser: esm
        }
      }
    })
  ),
  TE.bindTo('subpaths'),
  TE.bind('packageString', () => readFile(packageJsonPath, 'utf-8')),
  TE.bind('packageJson', ({ packageString }) =>
    TE.fromEither(parseJSON(packageString, (err) => new Error(`json parse error: ${(err as Error).message}`)))
  ),
  TE.chain(({ subpaths, packageJson }) =>
    writeFile(
      packageJsonPath,
      JSON.stringify({
        ...(packageJson as {}),
        exports: {
          '.': {
            traced: {
              browser: './dist/dist-traced/esm/index.js',
              node: {
                import: './dist/dist-traced/node/index.js',
                require: './dist/dist-traced/cjs/index.js'
              }
            },
            browser: './dist/dist/esm/index.js',
            node: {
              import: './dist/dist/node/index.js',
              require: './dist/dist/cjs/index.js'
            }
          },
          ...subpaths,
          './*': {
            traced: {
              browser: './dist/dist-traced/esm/*',
              node: {
                import: './dist/dist-traced/node/*',
                require: './dist/dist-traced/cjs/*'
              }
            },
            browser: './dist/dist/esm/*',
            node: {
              import: './dist/dist/node/*',
              require: './dist/dist/cjs/*'
            }
          }
        }
      })
    )
  ),
  TE.fold(onLeft, onRight('Subpath generation succeeded!'))
)().catch((e) => console.log(chalk.red.bold(`unexpected error ${e}`)))
