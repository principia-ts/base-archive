import * as Ev from '@principia/base/Eval'
import Bench from 'benchmark'

import * as Sy from '../src/Sync'

const evalLater = Ev.later(() => {
  const res = []
  for(let i = 0; i < 10000; i++) {
    res.push(i)
  }
  return res
})

const evalAlways = Ev.always(() => {
  const res = []
  for(let i = 0; i < 10000; i++) {
    res.push(i)
  }
  return res
})

const syncTotal = Sy.effectTotal(() => {
  const res = []
  for(let i = 0; i < 10000; i++) {
    res.push(i)
  }
  return res
})

const evalFac = (n: number): Ev.Eval<number> => Ev.gen(function* (_) {
  if(n === 0) {
    return 1
  } else {
    return n * (yield* _(evalFac(n - 1)))
  }
})

const syncFac = (n: number): Sy.USync<number> => Sy.gen(function* (_) {
  if(n === 0) {
    return 1
  } else {
    return n * (yield* _(syncFac(n - 1)))
  }
})

const suite = new Bench.Suite('eval vs. sync')

suite.add('eval', () => {
  Ev.evaluate(evalFac(100))
}).add('sync', () => {
  Sy.unsafeRun(syncFac(100))
}).add('evalLater', () => {
  Ev.evaluate(evalLater)
}).add('syncTotal', () => {
  Sy.unsafeRun(syncTotal)
}).add('evalAlways', () => {
  Ev.evaluate(evalAlways)
}).on('cycle', (event: any) => {
  console.log(String(event.target))
}).run()