import type { Cause } from '../../../Cause'
import type { Either } from '../../../Either'
import type { Exit } from '../../../Exit'
import type { UIO } from '../../../IO'

import * as Ca from '../../../Cause'
import * as E from '../../../Either'
import * as Ex from '../../../Exit'
import * as T from '../../../IO'
import * as P from '../../../Promise'
import * as Ref from '../../../Ref'
import { tuple } from '../../../tuple'

export interface AsyncInputProducer<Err, Elem, Done> {
  emit(el: Elem): UIO<unknown>
  done(a: Done): UIO<unknown>
  error(cause: Cause<Err>): UIO<unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(onError: (cause: Cause<Err>) => A, onElement: (element: Elem) => A, onDone: (done: Done) => A): UIO<A>
}

export class StateDone<A> {
  readonly _tag = 'Done'
  constructor(readonly a: A) {}
}

export class StateError<E> {
  readonly _tag = 'Error'
  constructor(readonly cause: Cause<E>) {}
}

export class StateEmpty {
  readonly _tag = 'Empty'
  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

export class StateEmit<Elem> {
  readonly _tag = 'Emit'
  constructor(readonly a: Elem, readonly notifyProducer: P.Promise<never, void>) {}
}

export type State<Err, Elem, Done> = StateEmpty | StateEmit<Elem> | StateError<Err> | StateDone<Done>

/**
 * An MVar-like abstraction for sending data to channels asynchronously. Designed
 * for one producer and multiple consumers.
 *
 * Features the following semantics:
 * - Buffer of size 1
 * - When emitting, the producer waits for a consumer to pick up the value
 *   to prevent "reading ahead" too much.
 * - Once an emitted element is read by a consumer, it is cleared from the buffer, so that
 *   at most one consumer sees every emitted element.
 * - When sending a done or error signal, the producer does not wait for a consumer
 *   to pick up the signal. The signal stays in the buffer after being read by a consumer,
 *   so it can be propagated to multiple consumers.
 * - Trying to publish another emit/error/done after an error/done have already been published
 *   results in an interruption.
 */
export class SingleProducerAsyncInput<Err, Elem, Done>
  implements AsyncInputProducer<Err, Elem, Done>, AsyncInputConsumer<Err, Elem, Done> {
  constructor(readonly ref: Ref.URef<State<Err, Elem, Done>>) {}

  emit(el: Elem): UIO<unknown> {
    return T.bind_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._tag) {
            case 'Emit': {
              return tuple(
                T.bind_(P.await(state.notifyProducer), () => this.emit(el)),
                state
              )
            }
            case 'Error': {
              return tuple(T.interrupt, state)
            }
            case 'Done': {
              return tuple(T.interrupt, state)
            }
            case 'Empty': {
              return tuple(
                T.bind_(P.succeed_(state.notifyConsumer, void 0), () => P.await(p)),
                new StateEmit(el, p)
              )
            }
          }
        })
      )
    )
  }

  done(a: Done): UIO<unknown> {
    return T.bind_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._tag) {
            case 'Emit': {
              return tuple(
                T.bind_(P.await(state.notifyProducer), () => this.done(a)),
                state
              )
            }
            case 'Error': {
              return tuple(T.interrupt, state)
            }
            case 'Done': {
              return tuple(T.interrupt, state)
            }
            case 'Empty': {
              return tuple(P.succeed_(state.notifyConsumer, void 0), new StateDone(a))
            }
          }
        })
      )
    )
  }

  error(cause: Cause<Err>): UIO<unknown> {
    return T.bind_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._tag) {
            case 'Emit': {
              return tuple(
                T.bind_(P.await(state.notifyProducer), () => this.error(cause)),
                state
              )
            }
            case 'Error': {
              return tuple(T.interrupt, state)
            }
            case 'Done': {
              return tuple(T.interrupt, state)
            }
            case 'Empty': {
              return tuple(P.succeed_(state.notifyConsumer, void 0), new StateError(cause))
            }
          }
        })
      )
    )
  }

  takeWith<X>(onError: (cause: Cause<Err>) => X, onElement: (element: Elem) => X, onDone: (done: Done) => X): UIO<X> {
    return T.bind_(P.make<never, void>(), (p) =>
      T.flatten(
        Ref.modify_(this.ref, (state) => {
          switch (state._tag) {
            case 'Emit': {
              return tuple(
                T.map_(P.succeed_(state.notifyProducer, void 0), () => onElement(state.a)),
                new StateEmpty(p)
              )
            }
            case 'Error': {
              return tuple(T.succeed(onError(state.cause)), state)
            }
            case 'Done': {
              return tuple(T.succeed(onDone(state.a)), state)
            }
            case 'Empty': {
              return tuple(
                T.bind_(P.await(state.notifyConsumer), () => this.takeWith(onError, onElement, onDone)),
                state
              )
            }
          }
        })
      )
    )
  }

  take = this.takeWith<Exit<Either<Err, Done>, Elem>>(
    (c) => Ex.halt(Ca.map_(c, E.Left)),
    (el) => Ex.succeed(el),
    (d) => Ex.fail(E.Right(d))
  )

  close = T.bind_(T.fiberId(), (id) => this.error(Ca.interrupt(id)))
}

/**
 * Creates a SingleProducerAsyncInput
 */
export function makeSingleProducerAsyncInput<Err, Elem, Done>(): UIO<SingleProducerAsyncInput<Err, Elem, Done>> {
  return T.map_(
    T.bind_(P.make<never, void>(), (p) => Ref.makeRef<State<Err, Elem, Done>>(new StateEmpty(p))),
    (ref) => new SingleProducerAsyncInput(ref)
  )
}
