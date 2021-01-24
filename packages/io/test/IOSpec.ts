import type { Has } from '@principia/base/Has'

import * as A from '@principia/base/Array'
import { eqStrict } from '@principia/base/Eq'
import * as Eq from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import { RuntimeException } from '@principia/io/Cause'
import * as Ca from '@principia/io/Cause'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as L from '@principia/io/Layer'
import {
  assert,
  assertM,
  defaultTestExecutor,
  equalTo,
  RunnableSpec,
  suite,
  tag,
  test,
  testM,
  TestRunner
} from '@principia/test'
import * as Annotations from '@principia/test/Annotation'
import * as BA from '@principia/test/FreeBooleanAlgebra'

export default new (class extends RunnableSpec<Has<Annotations.Annotations>, string> {
  spec = suite('IOSpec')(
    testM('map', () =>
      assertM(
        pipe(
          I.succeed('Hello'),
          I.map((s) => s.length)
        ),
        equalTo(5, Eq.number)
      )
    ),
    suite('bracket')(
      testM('happy path', () =>
        I.gen(function* (_) {
          const release  = yield* _(Ref.make(false))
          const result   = yield* _(
            pipe(
              I.succeed(42),
              I.bracket(
                (a) => I.effectTotal(() => a + 1),
                (_) => release.set(true)
              )
            )
          )
          const released = yield* _(release.get)
          return assert(result, equalTo(43, Eq.number))['&&'](assert(released, equalTo(true, Eq.boolean)))
        })
      ),
      testM('bracketExit error handling', () => {
        const releaseDied = new RuntimeException('release died')
        return I.gen(function* (_) {
          const exit  = yield* _(
            pipe(
              I.succeed(42),
              I.bracketExit(
                () => I.fail('use failed'),
                () => I.die(releaseDied)
              ),
              I.result
            )
          )
          const cause = yield* _(
            pipe(
              exit,
              Ex.foldM(I.succeed, () => I.fail('effect should have died'))
            )
          )
          return assert(Ca.failures(cause), equalTo(['use failed'], A.getEq(Eq.string)))
        })
      })
    )
  )
  aspects = []
  runner  = new TestRunner<Has<Annotations.Annotations>, string>(defaultTestExecutor(Annotations.live))
})()
