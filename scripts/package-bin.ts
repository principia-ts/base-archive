import chalk from 'chalk'
import * as A from 'fp-ts/Array'
import { parseJSON } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as R from 'fp-ts/lib/ReadonlyRecord'
import * as TE from 'fp-ts/lib/TaskEither'
import * as Path from 'path'

import { onLeft, onRight, readFile, writeFile } from './common'

const esmJSON   = JSON.stringify({ type: 'module' })
const shakeJSON = JSON.stringify({ module: './index.js' })
const cjsJSON   = JSON.stringify({ type: 'commonjs' })

pipe(
  readFile(Path.resolve(process.cwd(), 'package.json'), 'utf8'),
  TE.chain((content) =>
    TE.fromEither(parseJSON(content, (err) => new Error(`json parse error: ${(err as Error).message}`)))
  ),
  TE.map((content: any) => {
    const mut_content = { ...content }
    const exports     = pipe(
      mut_content['exports'],
      R.map((ex: any) => {
        const mut_ex = { ...ex }

        let esm          = (ex['import'] as string).split('/')
        esm              = [...esm.slice(0, 1), ...esm.slice(2)]
        mut_ex['import'] = esm.join('/')

        let cjs           = (ex['require'] as string).split('/')
        cjs               = [...cjs.slice(0, 1), ...cjs.slice(2)]
        mut_ex['require'] = cjs.join('/')

        return mut_ex
      })
    )
    mut_content['exports'] = exports
    return mut_content
  }),
  TE.chain((content: any) =>
    writeFile(
      Path.resolve(process.cwd(), 'dist/package.json'),
      JSON.stringify({
        author: content['author'],
        bin: content['bin'],
        dependencies: content['dependencies'],
        description: content['description'],
        sideEffects: false,
        exports: content['exports'],
        license: content['license'],
        main: './dist/cjs/index.js',
        name: content['name'],
        peerDependencies: content['peerDependencies'],
        private: false,
        publishConfig: {
          access: 'public'
        },
        repository: content['repository'],
        module: './dist/esm-shake/index.js',
        typings: './index.d.ts',
        version: content['version']
      })
    )
  ),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/cjs/package.json'), cjsJSON)),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/esm-shake/package.json'), shakeJSON)),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/esm-fix/package.json'), esmJSON)),
  TE.fold(onLeft, onRight('Package copy succeeded!'))
)().catch((e) => console.log(chalk.red.bold(`unexpected error ${e}`)))
