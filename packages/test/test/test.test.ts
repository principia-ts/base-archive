import type { Annotations } from '../src/Annotation'
import type { Has } from '@principia/base/Has'

import '@principia/base/unsafe/Operators'

import * as Eq from '@principia/base/Eq'
import { makeEq } from '@principia/base/Eq'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

import { assert, assertM, endsWith, equalTo, suite, test, testM, TestRunner } from '../src'
import { live as liveAnnotations } from '../src/Annotation'
import { RunnableSpec } from '../src/RunnableSpec'
import * as Spec from '../src/Spec'
import { nonFlaky } from '../src/TestAspect'
import * as TC from '../src/TestConfig'
import { defaultTestExecutor } from '../src/TestExecutor'

type Environment = Has<Annotations> & Has<TC.TestConfig> & { env: string }

class TestSpec extends RunnableSpec<Environment, never> {
  spec    = suite('Suite')(
    test('test1', () => assert(100, equalTo(100 as number, Eq.number))),
    test('ignoreMe', () => assert(['a', 'b', 'c'], endsWith(['b', 'c'], Eq.string)))['@@'](nonFlaky),
    testM('testM1', () =>
      assertM(
        I.effectAsync<unknown, never, string>((k) => {
          setTimeout(() => {
            k(I.succeed('hello'))
          }, 100)
        }),
        equalTo('hello', Eq.string)
      )
    )['@@'](nonFlaky),
    testM('env', () =>
      assertM(
        I.asksM((_: { env: string }) => I.succeed(_)),
        equalTo(
          { env: 'this is env' },
          makeEq((x, y) => x.env === y.env)
        )
      )
    )
  )
  aspects = []
  runner  = new TestRunner<Environment, never>(
    defaultTestExecutor(
      L.allPar(
        liveAnnotations,
        TC.live({ repeats: 10, retries: 0, samples: 0, shrinks: 0 }),
        L.fromRawEffect(I.succeed({ env: 'this is env' }))
      )
    )
  )
}

export default new TestSpec()
