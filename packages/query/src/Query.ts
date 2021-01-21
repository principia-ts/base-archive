import type { Cache } from './Cache'
import type { DataSource } from './DataSource'
import type { DataSourceAspect } from './DataSourceAspect'
import type { Result } from './internal/Result'
import type { Request } from './Request'
import type { IO } from '@principia/io/IO'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, identity, pipe, tuple } from '@principia/base/Function'
import * as It from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import { matchTag } from '@principia/base/util/matchers'
import * as Ca from '@principia/io/Cause'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'

import { empty } from './Cache'
import { Described } from './Described'
import * as BlockedRequest from './internal/BlockedRequest'
import * as BRS from './internal/BlockedRequests'
import * as Cont from './internal/Continue'
import { QueryContext } from './internal/QueryContext'
import * as Res from './internal/Result'
import { QueryFailure } from './QueryFailure'

/**
 * A `Query<R, E, A>` is a purely functional description of an effectual query
 * that may contain requests from one or more data sources, requires an
 * environment `R`, and may fail with an `E` or succeed with an `A`.
 *
 * Requests that can be performed in parallel, as expressed by `map2Par` and
 * combinators derived from it, will automatically be batched. Requests that
 * must be performed sequentially, as expressed by `map2` and combinators
 * derived from it, will automatically be pipelined. This allows for aggressive
 * data source specific optimizations. Requests can also be deduplicated and
 * cached.
 *
 * This allows for writing queries in a high level, compositional style, with
 * confidence that they will automatically be optimized.
 */
export class Query<R, E, A> {
  constructor(readonly step: IO<readonly [R, QueryContext], never, Result<R, E, A>>) {}
  ['@@']<R1>(f: DataSourceAspect<R1>): Query<R & R1, E, A> {
    return mapDataSources_(this, f)
  }
}

/*
 * -------------------------------------------
 * Run
 * -------------------------------------------
 */

export function runCache_<R, E, A>(ma: Query<R, E, A>, cache: Cache): I.IO<R, E, A> {
  return pipe(
    ma.step,
    I.gives((r: R) => [r, new QueryContext(cache)] as const),
    I.chain(
      matchTag({
        Blocked: ({ blockedRequests, cont }) =>
          I.andThen_(BRS.run_(blockedRequests, cache), Cont.runCache_(cont, cache)),
        Done: ({ value }) => I.succeed(value),
        Fail: ({ cause }) => I.halt(cause)
      })
    )
  )
}

export function runCache(cache: Cache): <R, E, A>(ma: Query<R, E, A>) => I.IO<R, E, A> {
  return (ma) => runCache_(ma, cache)
}

export function runLog<R, E, A>(ma: Query<R, E, A>): I.IO<R, E, readonly [Cache, A]> {
  return I.gen(function* (_) {
    const cache = yield* _(empty)
    const a     = yield* _(runCache_(ma, cache))
    return [cache, a]
  })
}

export function run<R, E, A>(ma: Query<R, E, A>): I.IO<R, E, A> {
  return pipe(
    ma,
    runLog,
    I.map(([, a]) => a)
  )
}

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

export function foldCauseM_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, B>
): Query<R & R1, E1, B> {
  return new Query(
    I.foldCauseM_(
      ma.step,
      (_) => onFailure(_).step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) =>
          I.succeed(Res.blocked(blockedRequests, Cont.foldCauseM_(cont, onFailure, onSuccess))),
        Done: ({ value }) => onSuccess(value).step,
        Fail: ({ cause }) => onFailure(cause).step
      })
    )
  )
}

export function foldCauseM<E, A, R1, E1, B>(
  onFailure: (cause: Ca.Cause<E>) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, B>
): <R>(ma: Query<R, E, A>) => Query<R & R1, E1, B> {
  return (ma) => foldCauseM_(ma, onFailure, onSuccess)
}

export function foldM_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  onFailure: (error: E) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, B>
): Query<R & R1, E1, B> {
  return foldCauseM_(ma, flow(Ca.failureOrCause, E.fold(onFailure, halt)), onSuccess)
}

export function foldM<E, A, R1, E1, B>(
  onFailure: (error: E) => Query<R1, E1, B>,
  onSuccess: (a: A) => Query<R1, E1, B>
): <R>(ma: Query<R, E, A>) => Query<R & R1, E1, B> {
  return (ma) => foldM_(ma, onFailure, onSuccess)
}

export function fold_<R, E, A, B>(
  ma: Query<R, E, A>,
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): Query<R, never, B> {
  return foldM_(
    ma,
    (e) => succeed(onFailure(e)),
    (a) => succeed(onSuccess(a))
  )
}

export function fold<E, A, B>(
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): <R>(ma: Query<R, E, A>) => Query<R, never, B> {
  return (ma) => fold_(ma, onFailure, onSuccess)
}

export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  h: (cause: Ca.Cause<E>) => Query<R1, E1, B>
): Query<R & R1, E1, A | B> {
  return foldCauseM_<R, E, A, R & R1, E1, A | B>(ma, h, succeed)
}

export function catchAllCause<E, R1, E1, B>(
  h: (cause: Ca.Cause<E>) => Query<R1, E1, B>
): <R, A>(ma: Query<R, E, A>) => Query<R & R1, E1, A | B> {
  return <R, A>(ma: Query<R, E, A>) => catchAllCause_(ma, h)
}

export function catchAll_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  h: (e: E) => Query<R1, E1, B>
): Query<R & R1, E1, A | B> {
  return foldM_<R, E, A, R & R1, E1, A | B>(ma, h, succeed)
}

export function catchAll<E, R1, E1, B>(
  h: (e: E) => Query<R1, E1, B>
): <R, A>(ma: Query<R, E, A>) => Query<R & R1, E1, A | B> {
  return <R, A>(ma: Query<R, E, A>) => catchAll_(ma, h)
}

/*
 * -------------------------------------------
 * Sequential Apply
 * -------------------------------------------
 */

export function map2_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.chain_(
      fa.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => {
          if (cont._tag === 'Effect') {
            return I.succeed(Res.blocked(blockedRequests, Cont.effect(map2_(cont.query, fb, f))))
          } else {
            return I.map_(
              fb.step,
              matchTag({
                Blocked: (br) =>
                  Res.blocked(BRS.then(blockedRequests, br.blockedRequests), Cont.map2_(cont, br.cont, f)),
                Done: ({ value }) =>
                  Res.blocked(
                    blockedRequests,
                    Cont.map_(cont, (a) => f(a, value))
                  ),
                Fail: ({ cause }) => Res.fail(cause)
              })
            )
          }
        },
        Done: (a) =>
          I.map_(
            fb.step,
            matchTag({
              Blocked: ({ blockedRequests, cont }) =>
                Res.blocked(
                  blockedRequests,
                  Cont.map_(cont, (b) => f(a.value, b))
                ),
              Done: (b) => Res.done(f(a.value, b.value)),
              Fail: (e) => Res.fail(e.cause)
            })
          ),
        Fail: ({ cause }) => I.succeed(Res.fail(cause))
      })
    )
  )
}

export function map2<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => map2_(fa, fb, f)
}

export function product_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return map2_(fa, fb, tuple)
}

export function product<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

export function ap_<R, E, A, R1, E1, B>(fab: Query<R, E, (a: A) => B>, fa: Query<R1, E1, A>): Query<R & R1, E | E1, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apFirst<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return map2_(fa, fb, (_, b) => b)
}

export function apSecond<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => apSecond_(fa, fb)
}

/*
 * -------------------------------------------
 * Parallel Apply
 * -------------------------------------------
 */

export function map2Par_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.map2Par_(fa.step, fb.step, (ra, rb) => {
      return ra._tag === 'Blocked'
        ? rb._tag === 'Blocked'
          ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.map2Par_(ra.cont, rb.cont, f))
          : rb._tag === 'Done'
          ? Res.blocked(
              ra.blockedRequests,
              Cont.map_(ra.cont, (a) => f(a, rb.value))
            )
          : Res.fail(rb.cause)
        : ra._tag === 'Done'
        ? rb._tag === 'Blocked'
          ? Res.blocked(
              rb.blockedRequests,
              Cont.map_(rb.cont, (b) => f(ra.value, b))
            )
          : rb._tag === 'Done'
          ? Res.done(f(ra.value, rb.value))
          : Res.fail(rb.cause)
        : rb._tag === 'Fail'
        ? Res.fail(Ca.both(ra.cause, rb.cause))
        : Res.fail(ra.cause)
    })
  )
}

export function map2Par<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => map2Par_(fa, fb, f)
}

export function productPar_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return map2Par_(fa, fb, tuple)
}

export function productPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => productPar_(fa, fb)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return map2Par_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function apFirstPar_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return map2Par_(fa, fb, (a, _) => a)
}

export function apFirstPar<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => apFirstPar_(fa, fb)
}

export function apSecondPar_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return map2Par_(fa, fb, (_, b) => b)
}

export function apSecondPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => apSecondPar_(fa, fb)
}

/*
 * -------------------------------------------
 * Batched Apply
 * -------------------------------------------
 */

export function map2Batched_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.map2_(fa.step, fb.step, (ra, rb) => {
      return ra._tag === 'Blocked'
        ? rb._tag === 'Blocked'
          ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.map2Batched_(ra.cont, rb.cont, f))
          : rb._tag === 'Done'
          ? Res.blocked(
              ra.blockedRequests,
              Cont.map_(ra.cont, (a) => f(a, rb.value))
            )
          : Res.fail(rb.cause)
        : ra._tag === 'Done'
        ? rb._tag === 'Blocked'
          ? Res.blocked(
              rb.blockedRequests,
              Cont.map_(rb.cont, (b) => f(ra.value, b))
            )
          : rb._tag === 'Done'
          ? Res.done(f(ra.value, rb.value))
          : Res.fail(rb.cause)
        : rb._tag === 'Fail'
        ? Res.fail(Ca.both(ra.cause, rb.cause))
        : Res.fail(ra.cause)
    })
  )
}

export function map2Batched<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => map2Batched_(fa, fb, f)
}

export function productBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return map2Batched_(fa, fb, tuple)
}

export function productBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => productBatched_(fa, fb)
}

export function apBatched_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return map2Batched_(fab, fa, (f, a) => f(a))
}

export function apBatched<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apBatched_(fab, fa)
}

export function apFirstBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, A> {
  return map2Batched_(fa, fb, (a, _) => a)
}

export function apFirstBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => apFirstBatched_(fa, fb)
}

export function apSecondBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return map2Batched_(fa, fb, (_, b) => b)
}

export function apSecondBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => apSecondBatched_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, E1, B>(pab: Query<R, E, A>, f: (e: E) => E1, g: (a: A) => B): Query<R, E1, B> {
  return foldM_(pab, flow(f, fail), flow(g, succeed))
}

export function bimap<E, A, E1, B>(f: (e: E) => E1, g: (a: A) => B): <R>(pab: Query<R, E, A>) => Query<R, E1, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapError_<R, E, A, E1>(pab: Query<R, E, A>, f: (e: E) => E1): Query<R, E1, A> {
  return bimap_(pab, f, identity)
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(pab: Query<R, E, A>) => Query<R, E1, A> {
  return (pab) => mapError_(pab, f)
}

export function mapErrorCause_<R, E, A, E1>(
  pab: Query<R, E, A>,
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): Query<R, E1, A> {
  return foldCauseM_(pab, flow(h, halt), succeed)
}

export function mapErrorCause<E, E1>(
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): <R, A>(pab: Query<R, E, A>) => Query<R, E1, A> {
  return (pab) => mapErrorCause_(pab, h)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export function absolve<R, E, E1, A>(v: Query<R, E, E.Either<E1, A>>): Query<R, E | E1, A> {
  return chain_(v, fromEither)
}

export function recover<R, E, A>(ma: Query<R, E, A>): Query<R, never, E.Either<E, A>> {
  return fold_(
    ma,
    (e) => E.left(e),
    (a) => E.right(a)
  )
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: Query<R, E, A>, f: (a: A) => B): Query<R, E, B> {
  return new Query(I.map_(fa.step, Res.map(f)))
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: Query<R, E, A>) => Query<R, E, B> {
  return (fa) => map_(fa, f)
}

export function as_<R, E, A, B>(fa: Query<R, E, A>, b: B): Query<R, E, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <R, E, A>(fa: Query<R, E, A>) => Query<R, E, B> {
  return (fa) => as_(fa, b)
}

export function mapDataSources_<R, E, A, R1>(fa: Query<R, E, A>, f: DataSourceAspect<R1>): Query<R & R1, E, A> {
  return new Query(I.map_(fa.step, Res.mapDataSources(f)))
}

export function mapDataSources<R1>(f: DataSourceAspect<R1>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E, A> {
  return (fa) => mapDataSources_(fa, f)
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function succeed<A>(value: A): Query<unknown, never, A> {
  return new Query(I.succeed(Res.done(value)))
}

export function halt<E>(cause: Ca.Cause<E>): Query<unknown, E, never> {
  return new Query(I.succeed(Res.fail(cause)))
}

export function fail<E>(error: E): Query<unknown, E, never> {
  return halt(Ca.fail(error))
}

export function die(error: Error): Query<unknown, never, never> {
  return new Query(I.die(error))
}

export function fromEffect<R, E, A>(effect: IO<R, E, A>): Query<R, E, A> {
  return new Query(
    pipe(
      effect,
      I.foldCause(Res.fail, Res.done),
      I.gives(([r, _]) => r)
    )
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): Query<unknown, E, A> {
  return pipe(succeed(either), chain(E.fold(fail, succeed)))
}

export function fromOption<A>(option: O.Option<A>): Query<unknown, O.Option<never>, A> {
  return pipe(succeed(option), chain(O.fold(() => fail(O.none()), succeed)))
}

export function fromRequest<R, E, A, B>(request: A & Request<E, B>, dataSource: DataSource<R, A>): Query<R, E, B> {
  return new Query(
    pipe(
      I.asksM(([_, qc]: readonly [R, QueryContext]) => qc.cache.lookup(request)),
      I.chain(
        E.fold(
          (ref) =>
            I.succeed(
              Res.blocked(
                BRS.single(dataSource, BlockedRequest.make(request, ref)),
                Cont.make(request, dataSource, ref)
              )
            ),
          (ref) =>
            pipe(
              ref.get,
              I.map(O.fold(() => Res.blocked(BRS.empty, Cont.make(request, dataSource, ref)), Res.fromEither))
            )
        )
      )
    )
  )
}

export function fromRequestUncached<R, E, A, B>(
  request: A & Request<E, B>,
  dataSource: DataSource<R, A>
): Query<R, E, B> {
  return new Query(
    pipe(
      Ref.make(O.none<E.Either<E, B>>()),
      I.map((ref) =>
        Res.blocked(BRS.single(dataSource, BlockedRequest.make(request, ref)), Cont.make(request, dataSource, ref))
      )
    )
  )
}

export const never: Query<unknown, never, never> = fromEffect(I.never)

export function none<A = never>(): Query<unknown, never, O.Option<A>> {
  return succeed(O.none())
}

export function some<A>(a: A): Query<unknown, never, O.Option<A>> {
  return succeed(O.some(a))
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function chain_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  f: (a: A) => Query<R1, E1, B>
): Query<R & R1, E | E1, B> {
  return new Query(
    I.chain_(
      ma.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => I.succeed(Res.blocked(blockedRequests, Cont.mapM_(cont, f))),
        Done: ({ value }) => f(value).step,
        Fail: ({ cause }) => I.succeed(Res.fail(cause))
      })
    )
  )
}

export function chain<A, R1, E1, B>(
  f: (a: A) => Query<R1, E1, B>
): <R, E>(ma: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (ma) => chain_(ma, f)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Query<R, never, R> {
  return fromEffect(I.ask())
}

export function asks<R, A>(f: (_: R) => A): Query<R, never, A> {
  return pipe(ask<R>(), map(f))
}

export function asksM<R0, R, E, A>(f: (_: R0) => Query<R, E, A>): Query<R0 & R, E, A> {
  return pipe(ask<R0>(), chain(f))
}

export function gives_<R, E, A, R0>(ra: Query<R, E, A>, f: Described<(r0: R0) => R>): Query<R0, E, A> {
  return new Query(
    pipe(
      ra.step,
      I.map((r) => Res.gives_(r, f)),
      I.gives(([r0, qc]) => [f.value(r0), qc] as const)
    )
  )
}

export function gives<R, R0>(f: Described<(r0: R0) => R>): <E, A>(ra: Query<R, E, A>) => Query<R0, E, A> {
  return (ra) => gives_(ra, f)
}

export function giveAll_<R, E, A>(ra: Query<R, E, A>, r: Described<R>): Query<unknown, E, A> {
  return gives_(
    ra,
    Described(() => r.value, `() => ${r.description}`)
  )
}

export function giveAll<R>(r: Described<R>): <E, A>(ra: Query<R, E, A>) => Query<unknown, E, A> {
  return (ra) => giveAll_(ra, r)
}

export function give_<E, A, R = unknown, R0 = unknown>(ra: Query<R & R0, E, A>, r: Described<R>): Query<R0, E, A> {
  return gives_(
    ra,
    Described((r0: R0) => ({ ...r0, ...r.value }), r.description)
  )
}

export function giveLayer_<R, E, A, R1, E1, A1>(
  ra: Query<R & A1, E, A>,
  layer: Described<L.Layer<R1, E1, A1>>
): Query<R & R1, E | E1, A> {
  return new Query(
    pipe(
      L.build(layer.value),
      M.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
      M.result,
      M.use(
        Ex.foldM(
          (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(Res.fail(c)),
          (r) =>
            gives_(
              ra,
              Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
            ).step
        )
      )
    )
  )
}

export function giveLayer<R1, E1, A1>(
  layer: Described<L.Layer<R1, E1, A1>>
): <R, E, A>(ra: Query<R & A1, E, A>) => Query<R & R1, E | E1, A> {
  return <R, E, A>(ra: Query<R & A1, E, A>) =>
    new Query(
      pipe(
        L.build(layer.value),
        M.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
        M.result,
        M.use(
          Ex.foldM(
            (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(Res.fail(c)),
            (r) =>
              gives_(
                ra,
                Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
              ).step
          )
        )
      )
    )
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function partitionM_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return pipe(as, foreach(flow(f, recover)), map(A.partitionMap(identity)))
}

export function partitionM<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitionM_(as, f)
}

export function partitonParM_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return pipe(as, foreachPar(flow(f, recover)), map(A.partitionMap(identity)))
}

export function partitionParM<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitonParM_(as, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function left<R, E, A, B>(ma: Query<R, E, E.Either<A, B>>): Query<R, O.Option<E>, A> {
  return foldM_(
    ma,
    flow(O.some, fail),
    E.fold(succeed, () => fail(O.none()))
  )
}

export function right<R, E, A, B>(ma: Query<R, E, E.Either<A, B>>): Query<R, O.Option<E>, B> {
  return foldM_(
    ma,
    flow(O.some, fail),
    E.fold(() => fail(O.none()), succeed)
  )
}

export function leftOrFail_<R, E, A, B, E1>(ma: Query<R, E, E.Either<A, B>>, e: E1): Query<R, E | E1, A> {
  return chain_(
    ma,
    E.fold(succeed, () => fail(e))
  )
}

export function leftOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, A> {
  return (ma) => leftOrFail_(ma, e)
}

export function leftOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (right: B) => E1
): Query<R, E | E1, A> {
  return chain_(ma, E.fold(succeed, flow(f, fail)))
}

export function leftOrFailWith<B, E1>(
  f: (right: B) => E1
): <R, E, A>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, A> {
  return (ma) => leftOrFailWith_(ma, f)
}

export function refineOrDie_<R, E extends Error, A, E1>(
  ma: Query<R, E, A>,
  pf: (e: E) => O.Option<E1>
): Query<R, E1, A> {
  return refineOrDieWith_(ma, pf, identity)
}

export function refineOrDie<E extends Error, E1>(
  pf: (e: E) => O.Option<E1>
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => refineOrDie_(ma, pf)
}

export function refineOrDieWith_<R, E, A, E1>(
  ma: Query<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => Error
): Query<R, E1, A> {
  return catchAll_(ma, (e) =>
    pipe(
      pf(e),
      O.fold(() => die(f(e)), fail)
    )
  )
}

export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => Error
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => refineOrDieWith_(ma, pf, f)
}

export function rightOrFail_<R, E, A, B, E1>(ma: Query<R, E, E.Either<A, B>>, e: E1): Query<R, E | E1, B> {
  return chain_(
    ma,
    E.fold(() => fail(e), succeed)
  )
}

export function rightOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFail_(ma, e)
}

export function rightOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (left: A) => E1
): Query<R, E | E1, B> {
  return chain_(ma, E.fold(flow(f, fail), succeed))
}

export function rightOrFailWith<A, E1>(
  f: (left: A) => E1
): <R, E, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFailWith_(ma, f)
}

export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => map2_(b, f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreach<A, R, E, B>(f: (a: A) => Query<R, E, B>): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function foreachPar_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => map2Par_(b, f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreachPar<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f)
}

export function foreachBatched_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Query<R, E, B>
): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) =>
      map2Batched_(b, f(a), (bs, b) => A.append(b)(bs))
    )
  )
}

export function foreachBatched<A, R, E, B>(
  f: (a: A) => Query<R, E, B>
): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreachBatched_(as, f)
}

export function optional<R, E, A>(ma: Query<R, E, A>): Query<R, E, O.Option<A>> {
  return foldCauseM_(
    ma,
    flow(
      Ca.stripSomeDefects((_) => !(_ instanceof QueryFailure)),
      O.fold(() => none(), halt)
    ),
    some
  )
}

export function orDieWith_<R, E, A>(ma: Query<R, E, A>, f: (e: E) => Error): Query<R, never, A> {
  return foldM_(ma, flow(f, die), succeed)
}

export function orDieWith<E>(f: (e: E) => Error): <R, A>(ma: Query<R, E, A>) => Query<R, never, A> {
  return (ma) => foldM_(ma, flow(f, die), succeed)
}

export function orDie<R, E extends Error, A>(ma: Query<R, E, A>): Query<R, never, A> {
  return orDieWith_(ma, identity)
}

export function sandbox<R, E, A>(ma: Query<R, E, A>): Query<R, Ca.Cause<E>, A> {
  return foldCauseM_(ma, fail, succeed)
}

export function unsandbox<R, E, A>(v: Query<R, Ca.Cause<E>, A>): Query<R, E, A> {
  return mapErrorCause_(v, Ca.flatten)
}

export function sandboxWith_<R, E, A, R1, E1, B>(
  ma: Query<R, E, A>,
  f: (query: Query<R, Ca.Cause<E>, A>) => Query<R1, Ca.Cause<E1>, B>
): Query<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)))
}

export function sandboxWith<R, E, A, R1, E1, B>(
  f: (query: Query<R, Ca.Cause<E>, A>) => Query<R1, Ca.Cause<E1>, B>
): (ma: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (ma) => sandboxWith_(ma, f)
}

export function getError<R, E, A>(ma: Query<R, O.Option<E>, A>): Query<R, E, O.Option<A>> {
  return foldM_(ma, O.fold(none, fail), some)
}

export function get<R, E, A>(ma: Query<R, E, O.Option<A>>): Query<R, O.Option<E>, A> {
  return foldM_(
    ma,
    flow(O.some, fail),
    O.fold(() => fail(O.none()), succeed)
  )
}

export function getOrFail_<R, E, A, E1>(ma: Query<R, E, O.Option<A>>, e: E1): Query<R, E | E1, A> {
  return chain_(
    ma,
    O.fold(() => fail(e), succeed)
  )
}

export function getOrFail<E1>(e: E1): <R, E, A>(ma: Query<R, E, O.Option<A>>) => Query<R, E | E1, A> {
  return (ma) => getOrFail_(ma, e)
}

export function summarized_<R, E, A, R1, E1, B, C>(
  ma: Query<R, E, A>,
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): Query<R & R1, E | E1, readonly [C, A]> {
  return pipe(
    fromEffect(summary),
    product(ma),
    map2(fromEffect(summary), ([start, value], end) => [f(start, end), value])
  )
}

export function summarized<R1, E1, B, C>(
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(ma: Query<R, E, A>) => Query<R & R1, E | E1, readonly [C, A]> {
  return (ma) => summarized_(ma, summary, f)
}

export function unrefineWith_<R, E, A, E1>(
  ma: Query<R, E, A>,
  pf: (error: unknown) => O.Option<E1>,
  f: (e: E) => E1
): Query<R, E1, A> {
  return catchAllCause_(ma, (cause) =>
    pipe(
      cause,
      Ca.find(pf),
      O.fold(() => pipe(cause, Ca.map(f), halt), fail)
    )
  )
}

export function unrefineWith<E, E1>(
  pf: (error: unknown) => O.Option<E1>,
  f: (e: E) => E1
): <R, A>(ma: Query<R, E, A>) => Query<R, E1, A> {
  return (ma) => unrefineWith_(ma, pf, f)
}

export function unrefine_<R, E, A>(ma: Query<R, E, A>, pf: (error: unknown) => O.Option<E>): Query<R, E, A> {
  return unrefineWith_(ma, pf, identity)
}

export function unrefine<E>(pf: (error: unknown) => O.Option<E>): <R, A>(ma: Query<R, E, A>) => Query<R, E, A> {
  return (ma) => unrefine_(ma, pf)
}
