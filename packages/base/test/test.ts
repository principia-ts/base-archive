import '../src/unsafe/Operators'

import * as Eval from '../src/control/Eval'

const factorial = (n: number): Eval.Eval<number> =>
  Eval.gen(function* (_) {
    if (n === 0) {
      return 1
    } else {
      return n * (yield* _(factorial(n - 1)))
    }
  })

console.time('A')
factorial(100)['|>'](Eval.evaluate)['|>'](console.log)
console.timeEnd('A')
