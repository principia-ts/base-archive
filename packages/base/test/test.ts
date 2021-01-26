import * as E from '../src/Either'
import { pipe } from '../src/Function'

pipe(
  E.pure('Hello'),
  E.bind((s) => E.left(s.length)),
  E.handleWith((n) => E.pure(n.toString())),
  E.fold(
    () => console.log('left'),
    (s) => console.log(`right: ${s}`)
  )
)
