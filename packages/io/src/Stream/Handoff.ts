import type { Option } from '@principia/base/data/Option'

import { constVoid, pipe } from '@principia/base/data/Function'
import { none, some } from '@principia/base/data/Option'
import { matchTag } from '@principia/base/util/matchers'

import * as I from '../IO'
import * as XR from '../IORef'
import * as XP from '../Promise'

type State<A> = Empty | Full<A>

class Empty {
  readonly _tag = 'Empty'
  constructor(readonly notifyConsumer: XP.Promise<never, void>) {}
}

class Full<A> {
  readonly _tag = 'Full'
  constructor(readonly a: A, readonly notifyProducer: XP.Promise<never, void>) {}
}

/**
 * A synchronous queue-like abstraction that allows a producer to offer
 * an element and wait for it to be taken, and allows a consumer to wait
 * for an element to be available.
 */
class Handoff<A> {
  readonly _tag = 'Handoff'
  constructor(readonly ref: XR.URef<State<A>>) {}
}

export function make<A>(): I.UIO<Handoff<A>> {
  return pipe(
    XP.make<never, void>(),
    I.flatMap((p) => XR.make<State<A>>(new Empty(p))),
    I.map((ref) => new Handoff(ref))
  )
}

export function offer<A>(a: A) {
  return (h: Handoff<A>): I.UIO<void> =>
    pipe(
      XP.make<never, void>(),
      I.flatMap((p) =>
        pipe(
          h.ref,
          XR.modify<I.UIO<void>, State<A>>(
            matchTag({
              Empty: ({ notifyConsumer }) =>
                [pipe(notifyConsumer, XP.succeed(constVoid()), I.apSecond(XP.await(p))), new Full(a, p)] as const,
              Full: (s) =>
                [
                  pipe(
                    XP.await(s.notifyProducer),
                    I.flatMap(() => offer(a)(h))
                  ),
                  s
                ] as const
            })
          ),
          I.flatten
        )
      )
    )
}

export function take<A>(h: Handoff<A>): I.UIO<A> {
  return pipe(
    XP.make<never, void>(),
    I.flatMap((p) =>
      pipe(
        h.ref,
        XR.modify<I.UIO<A>, State<A>>(
          matchTag({
            Empty: (s) =>
              [
                pipe(
                  s.notifyConsumer,
                  XP.await,
                  I.flatMap(() => take(h))
                ),
                s
              ] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(
                  notifyProducer,
                  XP.succeed(constVoid()),
                  I.as(() => a)
                ),
                new Empty(p)
              ] as const
          })
        ),
        I.flatten
      )
    )
  )
}

export function poll<A>(h: Handoff<A>): I.UIO<Option<A>> {
  return pipe(
    XP.make<never, void>(),
    I.flatMap((p) =>
      pipe(
        h.ref,
        XR.modify<I.UIO<Option<A>>, State<A>>(
          matchTag({
            Empty: (s) => [I.succeed(none()), s] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(
                  notifyProducer,
                  XP.succeed(constVoid()),
                  I.as(() => some(a))
                ),
                new Empty(p)
              ] as const
          })
        ),
        I.flatten
      )
    )
  )
}
