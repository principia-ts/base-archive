import * as E from '../src/Either'
import { getEitherT } from '../src/EitherT'
import * as Eval from '../src/Eval'
import { pipe } from '../src/Function'

const M = getEitherT(Eval.Monad)

console.log(
  pipe(
    M.pure('A'),
    M.bind((s) => Eval.later(() => E.left(s + 'B'))),
    Eval.map(
      E.fold(
        (s) => `Left: ${s}`,
        (_) => `Right: ${_}`
      )
    ),
    Eval.evaluate
  )
)
