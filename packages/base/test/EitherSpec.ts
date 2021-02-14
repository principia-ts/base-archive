import * as E from '@principia/base/Either'
import { eqStrict } from '@principia/base/Eq'
import { pipe } from '@principia/base/Function'
import { assert, deepStrictEqualTo, DefaultRunnableSpec, equalTo, suite, test } from '@principia/test'

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
      assert(
        pipe(
          E.right(1),
          E.alt(() => E.right(2))
        ),
        deepStrictEqualTo(E.right(1))
      )['&&'](
        assert(
          pipe(
            E.right(2),
            E.alt(() => E.left('a'))
          ),
          deepStrictEqualTo(E.right(2))
        )
          ['&&'](
            assert(
              pipe(
                E.left('a'),
                E.alt(() => E.right(2))
              ),
              deepStrictEqualTo(E.right(2))
            )
          )
          ['&&'](
            assert(
              pipe(
                E.left('a'),
                E.alt(() => E.left('b'))
              ),
              deepStrictEqualTo(E.left('b'))
            )
          )
      )),
    test('map', () => {
      const f = (s: string): number => s.length
      return assert(pipe(E.right('abc'), E.map(f)), equalTo(E.right(3), eqEitherStrict))['&&'](
        assert(pipe(E.left('s'), E.map(f)), deepStrictEqualTo(E.left('s')))
      )
    })
  )
}

export default new EitherSpec()
