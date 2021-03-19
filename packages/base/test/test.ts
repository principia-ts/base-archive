import * as E from '../src/Either'
import { _,match, when } from '../src/pattern'

console.log(
  match(E.Right('A'), E.Left(42), [1, 2, 3, 4])
    .case([when(E.isRight), when(E.isLeft), [_.number]], ([r, l, x]) => [r.right, l.left, x])
    .otherwise(() => 'shit')
)
