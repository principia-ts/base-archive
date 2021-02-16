import * as E from '@principia/base/Either'
import { eqStrict } from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import { assert, deepStrictEqualTo, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

import { identity } from '../src/Function'

const eqEitherStrict = E.getEq(eqStrict, eqStrict)

class EitherSpec extends DefaultRunnableSpec {
  spec = suite(
    'Either',
    test('mapLeft', () => {
      const double = (n: number): number => n * 2
      return assert(pipe(E.right('bar'), E.mapLeft(double)), equalTo(E.right('bar'), eqEitherStrict))['&&'](
        assert(pipe(E.left(2), E.mapLeft(double)), deepStrictEqualTo(E.left(4)))
      )
    }),
    test('alt', () =>
      assertAlt(E.right(1), E.right(2), E.right(1))
        ['&&'](assertAlt(E.right(1), E.left('b'), E.right(1)))
        ['&&'](assertAlt(E.left('a'), E.right(2), E.right(2)))
        ['&&'](assertAlt(E.left('a'), E.left('b'), E.left('b')))),
    test('map', () => {
      const f = (s: string): number => s.length
      return assert(pipe(E.right('abc'), E.map(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert(pipe(E.left('s'), E.map(f)), deepStrictEqualTo(E.left('s')))
      )
    }),
    test('ap', () =>
      assertAp(E.right(1), E.right(2), E.right(3))
        ['&&'](assertAp(E.right(1), E.left('b'), E.left('b')))
        ['&&'](assertAp(E.left('a'), E.right(2), E.left('a')))
        ['&&'](assertAp(E.left('a'), E.left('b'), E.left('a')))),
    test('apr', () => assert(pipe(E.right('a'), E.apr(E.right(1))), deepStrictEqualTo(E.right(1)))),
    test('bind', () => {
      const f = (s: string): E.Either<boolean, number> => E.right(s.length)
      return assert(pipe(E.right('abc'), E.bind(f)), deepStrictEqualTo(E.right(3)))['&&'](
        assert(pipe(E.left<string, string>('maError'), E.bind(f)), deepStrictEqualTo(E.left('maError')))
      )
    }),
    test('fromNullable', () =>
      assert(
        E.fromNullable_(null, () => 'default'),
        deepStrictEqualTo(E.left('default'))
      )
        ['&&'](
          assert(
            E.fromNullable_(undefined, () => 'default'),
            deepStrictEqualTo(E.left('default'))
          )
        )
        ['&&'](
          assert(
            E.fromNullable_(1, () => 'default'),
            deepStrictEqualTo(E.right(1))
          )
        )),
    test('tryCatch', () =>
      assert(
        E.tryCatch_(() => {
          throw 'string error'
        }, identity),
        deepStrictEqualTo(E.left('string error'))
      ))
  )
}

export default new EitherSpec()

const assertAlt = (a: E.Either<string, number>, b: E.Either<string, number>, expected: E.Either<string, number>) =>
  assert(
    pipe(
      a,
      E.alt(() => b)
    ),
    deepStrictEqualTo(expected)
  )

const assertAp = (a: E.Either<string, number>, b: E.Either<string, number>, expected: E.Either<string, number>) =>
  assert(
    pipe(
      a,
      E.map((a) => (b: number) => a + b),
      E.ap(b)
    ),
    deepStrictEqualTo(expected)
  )
