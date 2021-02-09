import type { Has } from '@principia/base/Has'

import '@principia/base/unsafe/Operators'

import * as Eq from '@principia/base/Eq'
import { makeEq } from '@principia/base/Eq'
import { none } from '@principia/base/Option'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'
import { defaultRandom, Random } from '@principia/io/Random'

import { assert, assertM, check, endsWith, equalTo, not, suite, test, TestConfig, testM, TestRunner } from '../src'
import { Annotations } from '../src/Annotation'
import * as Gen from '../src/Gen'
import { RunnableSpec } from '../src/RunnableSpec'
import * as Spec from '../src/Spec'
import { nonFlaky } from '../src/TestAspect'
import { defaultTestExecutor } from '../src/TestExecutor'

type Environment = Has<Annotations> & Has<Random> & Has<TestConfig> & { env: string }

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
    testM('check', () => check(Gen.int(0, 100))((n) => assert(n, equalTo(100, Eq.number)))),
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
        L.succeed(Random)(defaultRandom),
        Annotations.live,
        TestConfig.live({ repeats: 10, retries: 0, samples: 10, shrinks: 10 }),
        L.fromRawEffect(I.succeed({ env: 'this is env' }))
      )
    )
  )
}

new TestSpec().main({ tagSearchTerms: [], testSearchTerms: [], testTaskPolicy: none() })

export default new TestSpec()
