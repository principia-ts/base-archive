import chalk from 'chalk'
import * as A from 'fp-ts/Array'
import { parseJSON } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as R from 'fp-ts/lib/ReadonlyRecord'
import * as TE from 'fp-ts/lib/TaskEither'
import * as Path from 'path'

import { onLeft, onRight, readFile, writeFile } from './common'

const esmJSON = JSON.stringify({ type: 'module', sideEffects: false })
const cjsJSON = JSON.stringify({ type: 'commonjs', sideEffects: false })

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

        let esm           = (ex['browser'] as string).split('/')
        esm               = [...esm.slice(0, 1), ...esm.slice(2)]
        mut_ex['browser'] = esm.join('/')

        let node_import          = (ex['node']['import'] as string).split('/')
        node_import              = [...node_import.slice(0, 1), ...node_import.slice(2)]
        mut_ex['node']['import'] = node_import.join('/')

        let cjs                   = (ex['node']['require'] as string).split('/')
        cjs                       = [...cjs.slice(0, 1), ...cjs.slice(2)]
        mut_ex['node']['require'] = cjs.join('/')

        if (ex['traced']) {
          let esm                     = (ex['traced']['browser'] as string).split('/')
          esm                         = [...esm.slice(0, 1), ...esm.slice(2)]
          mut_ex['traced']['browser'] = esm.join('/')

          let node_import                    = (ex['traced']['node']['import'] as string).split('/')
          node_import                        = [...node_import.slice(0, 1), ...node_import.slice(2)]
          mut_ex['traced']['node']['import'] = node_import.join('/')

          let cjs                             = (ex['traced']['node']['require'] as string).split('/')
          cjs                                 = [...cjs.slice(0, 1), ...cjs.slice(2)]
          mut_ex['traced']['node']['require'] = cjs.join('/')
        }

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
        dependencies: content['dependencies'],
        description: content['description'],
        sideEffects: false,
        exports: content['exports'],
        main: content['main'],
        module: content['module'],
        license: content['license'],
        name: content['name'],
        peerDependencies: content['peerDependencies'],
        private: false,
        publishConfig: {
          access: 'public'
        },
        repository: content['repository'],
        typings: './index.d.ts',
        version: content['version']
      })
    )
  ),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/cjs/package.json'), cjsJSON)),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/esm/package.json'), esmJSON)),
  TE.chain(() => writeFile(Path.resolve(process.cwd(), 'dist/dist/node/package.json'), esmJSON)),
  TE.fold(onLeft, onRight('Package copy succeeded!'))
)().catch((e) => console.log(chalk.red.bold(`unexpected error ${e}`)))
