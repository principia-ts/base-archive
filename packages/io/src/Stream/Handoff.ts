import type { Option } from '@principia/base/Option'

import { pipe } from '@principia/base/function'
import { None, Some } from '@principia/base/Option'
import { matchTag } from '@principia/base/util/matchers'

import * as I from '../IO'
import * as Ref from '../IORef'
import * as P from '../Promise'

type State<A> = Empty | Full<A>

class Empty {
  readonly _tag = 'Empty'
  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

class Full<A> {
  readonly _tag = 'Full'
  constructor(readonly a: A, readonly notifyProducer: P.Promise<never, void>) {}
}

/**
 * A synchronous queue-like abstraction that allows a producer to offer
 * an element and wait for it to be taken, and allows a consumer to wait
 * for an element to be available.
 */
class Handoff<A> {
  readonly _tag = 'Handoff'
  constructor(readonly ref: Ref.URef<State<A>>) {}
}

export function make<A>(): I.UIO<Handoff<A>> {
  return pipe(
    P.make<never, void>(),
    I.bind((p) => Ref.make<State<A>>(new Empty(p))),
    I.map((ref) => new Handoff(ref))
  )
}

export function offer<A>(a: A) {
  return (h: Handoff<A>): I.UIO<void> =>
    pipe(
      P.make<never, void>(),
      I.bind((p) =>
        pipe(
          h.ref,
          Ref.modify<I.UIO<void>, State<A>>(
            matchTag({
              Empty: ({ notifyConsumer }) =>
                [pipe(notifyConsumer.succeed(undefined), I.apr(p.await)), new Full(a, p)] as const,
              Full: (s) =>
                [
                  pipe(
                    s.notifyProducer.await,
                    I.bind(() => offer(a)(h))
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
    P.make<never, void>(),
    I.bind((p) =>
      pipe(
        h.ref,
        Ref.modify<I.UIO<A>, State<A>>(
          matchTag({
            Empty: (s) =>
              [
                pipe(
                  s.notifyConsumer.await,
                  I.bind(() => take(h))
                ),
                s
              ] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(
                  notifyProducer.succeed(undefined),
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
    P.make<never, void>(),
    I.bind((p) =>
      pipe(
        h.ref,
        Ref.modify<I.UIO<Option<A>>, State<A>>(
          matchTag({
            Empty: (s) => [I.succeed(None()), s] as const,
            Full: ({ a, notifyProducer }) =>
              [
                pipe(
                  notifyProducer.succeed(undefined),
                  I.as(() => Some(a))
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
