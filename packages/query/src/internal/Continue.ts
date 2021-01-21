import type { Cache } from '../Cache'
import type { DataSource } from '../DataSource'
import type { DataSourceAspect } from '../DataSourceAspect'
import type { Described } from '../Described'
import type { Query } from '../Query'
import type { Request } from '../Request'
import type * as Ca from '@principia/io/Cause'
import type { FIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { matchTag_ } from '@principia/base/util/matchers'
import * as I from '@principia/io/IO'

import * as Q from '../Query'

export class Effect<R, E, A> {
  readonly _tag = 'Effect'
  constructor(readonly query: Query<R, E, A>) {}
}

export function effect<R, E, A>(query: Query<R, E, A>): Continue<R, E, A> {
  return new Effect(query)
}

export class Get<E, A> {
  readonly _tag = 'Get'
  constructor(readonly io: FIO<E, A>) {}
}

export function get<E, A>(io: FIO<E, A>): Continue<unknown, E, A> {
  return new Get(io)
}

export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>

export function foldCauseM_<R, E, A, R1, E1, B>(
  cont: Continue<R, E, A>,
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, B>
): Continue<R & R1, E1, B> {
  return matchTag_(cont, {
    Effect: ({ query }) => new Effect(Q.foldCauseM_(query, onFailure, onSuccess)),
    Get: ({ io }) => pipe(Q.fromEffect(io), (q) => Q.foldCauseM_(q, onFailure, onSuccess), effect)
  })
}

export function mapError_<R, E, A, E1>(fa: Continue<R, E, A>, f: (e: E) => E1): Continue<R, E1, A> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.mapError_(query, f)),
    Get: ({ io }) => pipe(io, I.mapError(f), get)
  })
}

export function map2_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.map2_(fa.query, fb.query, f))
      : effect(Q.map2_(fa.query, Q.fromEffect(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromEffect(fa.io), Q.map2(fb.query, f)))
    : get(I.map2_(fa.io, fb.io, f))
}

export function map_<R, E, A, B>(fa: Continue<R, E, A>, f: (a: A) => B): Continue<R, E, B> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.map_(query, f)),
    Get: ({ io }) => get(I.map_(io, f))
  })
}

export function map2Par_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.map2Par_(fa.query, fb.query, f))
      : effect(Q.map2_(fa.query, Q.fromEffect(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromEffect(fa.io), Q.map2(fb.query, f)))
    : get(I.map2_(fa.io, fb.io, f))
}

export function map2Batched_<R, E, A, R1, E1, B, C>(
  fa: Continue<R, E, A>,
  fb: Continue<R1, E1, B>,
  f: (a: A, b: B) => C
): Continue<R & R1, E | E1, C> {
  return fa._tag === 'Effect'
    ? fb._tag === 'Effect'
      ? effect(Q.map2Batched_(fa.query, fb.query, f))
      : effect(Q.map2_(fa.query, Q.fromEffect(fb.io), f))
    : fb._tag === 'Effect'
    ? effect(pipe(Q.fromEffect(fa.io), Q.map2(fb.query, f)))
    : get(I.map2_(fa.io, fb.io, f))
}

export function mapDataSources_<R, E, A, R1>(fa: Continue<R, E, A>, f: DataSourceAspect<R1>): Continue<R & R1, E, A> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.mapDataSources_(query, f)),
    Get: ({ io }) => get(io)
  })
}

export function make<R, E, A extends Request<E, B>, B>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: URef<O.Option<E.Either<E, B>>>
): Continue<R, E, B> {
  return get(
    pipe(
      ref.get,
      I.chain(
        O.fold(
          () => I.dieMessage('TODO: Query Failure'),
          (a) => I.fromEither(() => a)
        )
      )
    )
  )
}

export function mapM_<R, E, A, R1, E1, B>(
  fa: Continue<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Continue<R & R1, E | E1, B> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.chain_(query, f)),
    Get: ({ io }) => effect(pipe(Q.fromEffect(io), Q.chain(f)))
  })
}

export function gives_<R, E, A, R0>(fa: Continue<R, E, A>, f: Described<(r0: R0) => R>): Continue<R0, E, A> {
  return matchTag_(fa, {
    Effect: ({ query }) => effect(Q.gives_(query, f)),
    Get: ({ io }) => get(io)
  })
}

export function runCache_<R, E, A>(ma: Continue<R, E, A>, cache: Cache): I.IO<R, E, A> {
  return matchTag_(ma, {
    Effect: ({ query }) => Q.runCache_(query, cache),
    Get: ({ io }) => io
  })
}
