import { pipe } from '@principia/base/Function'
import * as I from '@principia/io/IO'
import glob_ from 'glob'

export function glob(glob: string, opts: glob_.IOptions = {}): I.FIO<Error, ReadonlyArray<string>> {
  return I.effectAsync((k) => {
    glob_(glob, opts, (err, result) => (err == null ? k(I.succeed(result)) : k(I.fail(err))))
  })
}
