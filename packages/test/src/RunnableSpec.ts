import type { XSpec } from './Spec'
import type { TestLogger } from './TestLogger'
import type { Has } from '@principia/base/Has'
import type { Clock } from '@principia/io/Clock'
import type { URIO } from '@principia/io/IO'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { string } from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import { makeMonoid } from '@principia/base/Monoid'
import { Option } from '@principia/base/Option'
import * as O from '@principia/base/Option'
import { semigroupAny } from '@principia/base/Semigroup'
import { matchTag } from '@principia/base/util/matchers'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as N from '@principia/node/Runtime'

import { AbstractRunnableSpec } from './AbstractRunnableSpec'
import * as ExSp from './ExecutedSpec'
import * as S from './Spec'
import * as TA from './TestArgs'

export abstract class RunnableSpec<R, E> extends AbstractRunnableSpec<R, E> {
  private run(spec: XSpec<R, E>): URIO<Has<TestLogger> & Has<Clock>, number> {
    const self = this
    return I.gen(function* (_) {
      const results     = yield* _(self.runSpec(spec))
      const hasFailures = ExSp.exists_(
        results,
        matchTag(
          {
            Test: ({ test }) => E.isLeft(test)
          },
          () => false
        )
      )
      // TODO: Summary
      return hasFailures ? 1 : 0
    })
  }
  main(args: ReadonlyArray<string>): void {
    I.run(I.giveLayer_(this.run(this.spec), this.runner.bootstrap), (ex) =>
      ex._tag === 'Success' ? process.exit(ex.value) : process.exit(1)
    )
  }
}
