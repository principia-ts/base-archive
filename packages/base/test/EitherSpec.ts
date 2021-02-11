import type { Has } from '@principia/base/Has'

import * as E from '@principia/base/Either'
import { eqStrict } from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import * as L from '@principia/io/Layer'
import * as t from '@principia/test'
import { assert, equalTo, RunnableSpec, suite, test, TestRunner } from '@principia/test'
import { Annotations } from '@principia/test/Annotation'

const eqEitherStrict = E.getEq(eqStrict, eqStrict)

export default new (class extends RunnableSpec<Has<Annotations>, never> {
  spec = suite('Either')(
    test('mapLeft', () => {
      const double = (n: number): number => n * 2
      return assert(pipe(E.right('bar'), E.mapLeft(double)), equalTo(E.right('bar'), eqEitherStrict))['&&'](
        assert(pipe(E.left(2), E.mapLeft(double)), equalTo(E.left(4), eqEitherStrict))
      )
    }),
    test('map', () => {
      const f = (s: string): number => s.length
      return assert(pipe(E.right('abc'), E.map(f)), equalTo(E.right(3), eqEitherStrict))['&&'](
        assert(pipe(E.left('s'), E.map(f)), equalTo(E.left('s'), eqEitherStrict))
      )
    })
  )
  aspects = []
  runner  = new TestRunner<Has<Annotations>, never>(t.defaultTestExecutor(Annotations.live))
})()
