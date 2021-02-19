import type { Cause } from '@principia/io/Cause'

import '@principia/compile/enableTracing'

import { pipe, tuple } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import { none, some } from '@principia/base/Option'
import { inspect } from 'util'

import * as Ca from '../src/Cause'
import { ClockTag, LiveClock } from '../src/Clock'
import * as I from '../src/IO'
import * as Ref from '../src/IORef'
import * as L from '../src/Layer'
import * as Sc from '../src/Schedule'

interface Svc1 {
  a: string
}

const Svc1 = tag<string>()

interface Svc2 {
  b: number
}

const Svc2 = tag<number>()

interface Svc3 {
  c: boolean
}

const Svc3 = tag<Svc3>()

const l1 = L.fromEffect(Svc1)(I.succeed('hello'))

const ref = Ref.unsafeMake(0)

const l2 = L.fromEffect(Svc2)(
  I.gen(function* (_) {
    const svc1 = yield* _(Svc1)
    return yield* _(
      pipe(
        ref.get,
        I.bind((n) => {
          if (n < 5) {
            return Ref.update_(ref, (n) => n + 1)['*>'](I.fail('not yet'))
          } else {
            return I.succeed(svc1.length)
          }
        })
      )
    )
  })
)

const l4 = L.fold_(
  l2,
  pipe(
    L.second<Cause<string>>(),
    L.bind((c) =>
      Ca.find_(c, (_) => (_._tag === 'Fail' && _.value === 'bad' ? some(undefined) : none()))._tag === 'Some'
        ? L.succeed(Svc2)(5)
        : L.fail('really bad')
    )
  ),
  L.identity()
)

pipe(
  I.asksServiceM(Svc2)((n) => I.effectTotal(() => console.log(n))),
  I.giveLayer(l1['>>'](L.retry_(l4, Sc.spaced(100)))),
  I.run((ex) => console.log(inspect(ex, { depth: 10 })))
)

// const l1 = L.fromRawEffect(I.asks((_: [{ a: string }, { b: number }]) => _))
// const l2 = L.first<{ a: string }>()
// const l3 = l1['>>>'](l2)

// pipe(
//   I.asksM((_: { a: string }) => I.effectTotal(() => console.log(_))),
//   I.giveLayer(l3),
//   I.giveAll(tuple({ a: 'string' }, { b: 0 }) as [{ a: string }, { b: number }]),
//   I.run((ex) => console.log(inspect(ex)))
// )
