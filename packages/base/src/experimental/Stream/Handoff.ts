import type * as Ca from '../../Cause'
import type * as C from '../../Chunk'
import type * as SER from './SinkEndReason'

import { pipe } from '../../function'
import * as I from '../../IO'
import * as O from '../../Option'
import * as P from '../../Promise'
import * as Ref from '../../Ref'
import { tuple } from '../../tuple'

export class Handoff<A> {
  constructor(readonly ref: Ref.URef<State<A>>) {}
}

export function make<A>() {
  return pipe(
    P.make<never, void>(),
    I.bind((p) => Ref.makeRef<State<A>>(new Empty(p))),
    I.map((_) => new Handoff(_))
  )
}

export const StateTypeId = Symbol()

export const EmptyTypeId = Symbol()
export class Empty {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof EmptyTypeId      = EmptyTypeId

  constructor(readonly notifyConsumer: P.Promise<never, void>) {}
}

export const FullTypeId = Symbol()
export class Full<A> {
  readonly _stateTypeId: typeof StateTypeId = StateTypeId
  readonly _typeId: typeof FullTypeId       = FullTypeId

  constructor(readonly a: A, readonly notifyConsumer: P.Promise<never, void>) {}
}

export type State<A> = Empty | Full<A>

export function offer<A>(handoff: Handoff<A>, a: A): I.UIO<void> {
  return I.bind_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(I.apr_(P.await(s.notifyConsumer), offer(handoff, a)), s)
        } else {
          return tuple(I.apr_(P.succeed_(s.notifyConsumer, undefined), P.await(p)), new Full(a, p))
        }
      }),
      I.flatten
    )
  })
}

export function take<A>(handoff: Handoff<A>): I.UIO<A> {
  return I.bind_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(
            I.as_(P.succeed_(s.notifyConsumer, undefined), () => s.a),
            new Empty(p)
          )
        } else {
          return tuple(I.apr_(P.await(s.notifyConsumer), take(handoff)), s)
        }
      }),
      I.flatten
    )
  })
}

export function poll<A>(handoff: Handoff<A>): I.UIO<O.Option<A>> {
  return I.bind_(P.make<never, void>(), (p) => {
    return pipe(
      handoff.ref,
      Ref.modify((s) => {
        if (s._typeId === FullTypeId) {
          return tuple(
            I.as_(P.succeed_(s.notifyConsumer, undefined), () => O.Some(s.a)),
            new Empty(p)
          )
        } else {
          return tuple(I.succeed(O.None()), s)
        }
      }),
      I.flatten
    )
  })
}

export const HandoffSignalTypeId = Symbol()

export const EmitTypeId = Symbol()
export class Emit<A> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EmitTypeId                       = EmitTypeId

  constructor(readonly els: C.Chunk<A>) {}
}

export const HaltTypeId = Symbol()
export class Halt<E> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof HaltTypeId                       = HaltTypeId

  constructor(readonly error: Ca.Cause<E>) {}
}

export const EndTypeId = Symbol()
export class End<C> {
  readonly _handoffSignalTypeId: typeof HandoffSignalTypeId = HandoffSignalTypeId
  readonly _typeId: typeof EndTypeId                        = EndTypeId

  constructor(readonly reason: SER.SinkEndReason<C>) {}
}

export type HandoffSignal<C, E, A> = Emit<A> | Halt<E> | End<C>
