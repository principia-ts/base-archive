import '@principia/base/unsafe/Operators'

import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { none } from '@principia/base/Option'
import * as I from '@principia/io/IO'

import { assert, assertM, check, deepStrictEqualTo, endsWith, equalTo, suite, test, testM } from '../src'
import { DefaultRunnableSpec } from '../src/DefaultRunnableSpec'
import { Live } from '../src/environment/Live'
import * as Gen from '../src/Gen'
import { nonFlaky } from '../src/TestAspect'

class TestSpec extends DefaultRunnableSpec {
  spec = suite(
    'Suite',
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
    testM('check', () => check(Gen.int(0, 100), (n) => assert(n, equalTo(100, Eq.number)))),
    test('deepStrict', () => assert(E.left('left'), deepStrictEqualTo(E.left('left')))),
    testM('long', () => assertM(Live.live(I.delay_(I.succeed('Long'), 100000)), equalTo('Long', Eq.string)))
  )
}

new TestSpec().main({ tagSearchTerms: [], testSearchTerms: [], testTaskPolicy: none() })

export default new TestSpec()
