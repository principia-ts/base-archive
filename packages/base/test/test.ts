import { Suite } from 'benchmark'

import * as E from '../src/Either'

const fa             = E.Right(1)
const numberToString = (a: number) => a.toString()

new Suite('ap vs. crossWith')
  .add('ap', () => E.ap_(E.Right(numberToString), fa))
  .add('apCw', () => E.apCw(E.Right(numberToString), fa))
  .on('cycle', (event: any) => {
    console.log(String(event.target))
  })
  .run()
