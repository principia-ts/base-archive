import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as I from '@principia/io/IO'
import { isRunnableSpec, RunnableSpec } from '@principia/test/RunnableSpec'
import { TestArgs } from '@principia/test/TestArgs'
import { createRequire } from 'module'
import path from 'path'
import yargs from 'yargs'

import { glob } from './util'

const _require = createRequire(import.meta.url)

_require('ts-node').register()

const argv = yargs(process.argv.slice(2))
  .options({
    path: { string: true },
    tests: { alias: 't', array: true, string: true },
    tags: { array: true, string: true },
    policy: { string: true }
  })
  .help().argv

const testArgs = new TestArgs(argv.tests || [], argv.tags || [], O.fromNullable(argv.policy))

const program = pipe(
  glob(argv.path ?? './**/test/*Spec.ts'),
  I.map(
    A.map((s) => {
      const parsed = path.parse(s)
      return `${process.cwd()}/${parsed.dir}/${parsed.name}`
    })
  ),
  I.bind(I.foreach((path) => I.effect(() => _require(path).default))),
  I.bind(I.foreach((test) => (isRunnableSpec(test) ? I.effectTotal(() => test.main(testArgs)) : I.unit())))
)

I.run(program)
