import type { Cache } from './Cache'
import type { DataSource } from './DataSource'
import type { DataSourceAspect } from './DataSourceAspect'
import type { Result } from './internal/Result'
import type { Request } from './Request'
import type { Has, Tag } from '@principia/base/Has'
import type { IO } from '@principia/io/IO'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, identity, pipe } from '@principia/base/function'
import { mergeEnvironments } from '@principia/base/Has'
import * as It from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import { match_, not } from '@principia/base/pattern'
import { tuple } from '@principia/base/tuple'
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
    I.bind(
      matchTag({
        Blocked: ({ blockedRequests, cont }) => I.apr_(BRS.run_(blockedRequests, cache), Cont.runCache_(cont, cache)),
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
    I.matchCauseM_(
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
  return foldCauseM_(ma, flow(Ca.failureOrCause, E.match(onFailure, halt)), onSuccess)
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

export function crossWith_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.bind_(
      fa.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => {
          if (cont._tag === 'Effect') {
            return I.succeed(Res.blocked(blockedRequests, Cont.effect(crossWith_(cont.query, fb, f))))
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

export function crossWith<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<R, E, A, R1, E1, B>(fab: Query<R, E, (a: A) => B>, fa: Query<R1, E1, A>): Query<R & R1, E | E1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => apr_(fa, fb)
}

/*
 * -------------------------------------------
 * Parallel Apply
 * -------------------------------------------
 */

export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.crossWithPar_(fa.step, fb.step, (ra, rb) => {
      return match_(ra, rb)(
        [
          [{ _tag: 'Blocked' }, { _tag: 'Blocked' }],
          ([ra, rb]) =>
            Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.crossWithPar_(ra.cont, rb.cont, f))
        ],
        [
          [{ _tag: 'Blocked' }, { _tag: 'Done' }],
          ([ra, rb]) =>
            Res.blocked(
              ra.blockedRequests,
              Cont.map_(ra.cont, (a) => f(a, rb.value))
            )
        ],
        [
          [{ _tag: 'Done' }, { _tag: 'Blocked' }],
          ([ra, rb]) =>
            Res.blocked(
              rb.blockedRequests,
              Cont.map_(rb.cont, (b) => f(ra.value, b))
            )
        ],
        [[{ _tag: 'Done' }, { _tag: 'Done' }], ([ra, rb]) => Res.done(f(ra.value, rb.value))],
        [[{ _tag: 'Fail' }, { _tag: 'Fail' }], ([ra, rb]) => Res.fail(Ca.both(ra.cause, rb.cause))],
        [[{ _tag: 'Fail' }, { _tag: not('Fail') }], ([ra, _]) => Res.fail(ra.cause)],
        [[{ _tag: not('Fail') }, { _tag: 'Fail' }], ([_, rb]) => Res.fail(rb.cause)]
      )
      /*
       * return ra._tag === 'Blocked'
       *   ? rb._tag === 'Blocked'
       *     ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.crossWithPar_(ra.cont, rb.cont, f))
       *     : rb._tag === 'Done'
       *     ? Res.blocked(
       *         ra.blockedRequests,
       *         Cont.map_(ra.cont, (a) => f(a, rb.value))
       *       )
       *     : Res.fail(rb.cause)
       *   : ra._tag === 'Done'
       *   ? rb._tag === 'Blocked'
       *     ? Res.blocked(
       *         rb.blockedRequests,
       *         Cont.map_(rb.cont, (b) => f(ra.value, b))
       *       )
       *     : rb._tag === 'Done'
       *     ? Res.done(f(ra.value, rb.value))
       *     : Res.fail(rb.cause)
       *   : rb._tag === 'Fail'
       *   ? Res.fail(Ca.both(ra.cause, rb.cause))
       *   : Res.fail(ra.cause)
       */
    })
  )
}

export function crossWithPar<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function crossPar_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

export function crossPar<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return crossWithPar_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function aplPar_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return crossWithPar_(fa, fb, (a, _) => a)
}

export function aplPar<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => aplPar_(fa, fb)
}

export function aprPar_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return crossWithPar_(fa, fb, (_, b) => b)
}

export function aprPar<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => aprPar_(fa, fb)
}

/*
 * -------------------------------------------
 * Batched Apply
 * -------------------------------------------
 */

export function crossWithBatched_<R, E, A, R1, E1, B, C>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): Query<R & R1, E | E1, C> {
  return new Query(
    I.crossWith_(fa.step, fb.step, (ra, rb) => {
      return ra._tag === 'Blocked'
        ? rb._tag === 'Blocked'
          ? Res.blocked(BRS.then(ra.blockedRequests, rb.blockedRequests), Cont.crossWithBatched_(ra.cont, rb.cont, f))
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

export function crossWithBatched<A, R1, E1, B, C>(
  fb: Query<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Query<R, E, A>) => Query<R & R1, E | E1, C> {
  return (fa) => crossWithBatched_(fa, fb, f)
}

export function crossBatched_<R, E, A, R1, E1, B>(
  fa: Query<R, E, A>,
  fb: Query<R1, E1, B>
): Query<R & R1, E | E1, readonly [A, B]> {
  return crossWithBatched_(fa, fb, tuple)
}

export function crossBatched<R1, E1, B>(
  fb: Query<R1, E1, B>
): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossBatched_(fa, fb)
}

export function apBatched_<R, E, A, R1, E1, B>(
  fab: Query<R, E, (a: A) => B>,
  fa: Query<R1, E1, A>
): Query<R & R1, E | E1, B> {
  return crossWithBatched_(fab, fa, (f, a) => f(a))
}

export function apBatched<R, E, A>(
  fa: Query<R, E, A>
): <R1, E1, B>(fab: Query<R1, E1, (a: A) => B>) => Query<R & R1, E | E1, B> {
  return (fab) => apBatched_(fab, fa)
}

export function aplBatched_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, A> {
  return crossWithBatched_(fa, fb, (a, _) => a)
}

export function aplBatched<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, A> {
  return (fa) => aplBatched_(fa, fb)
}

export function aprBatched_<R, E, A, R1, E1, B>(fa: Query<R, E, A>, fb: Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return crossWithBatched_(fa, fb, (_, b) => b)
}

export function aprBatched<R1, E1, B>(fb: Query<R1, E1, B>): <R, E, A>(fa: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (fa) => aprBatched_(fa, fb)
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
  return bind_(v, fromEither)
}

export function recover<R, E, A>(ma: Query<R, E, A>): Query<R, never, E.Either<E, A>> {
  return fold_(
    ma,
    (e) => E.Left(e),
    (a) => E.Right(a)
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
      I.matchCause(Res.fail, Res.done),
      I.gives(([r, _]) => r)
    )
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): Query<unknown, E, A> {
  return pipe(succeed(either), bind(E.match(fail, succeed)))
}

export function fromOption<A>(option: O.Option<A>): Query<unknown, O.Option<never>, A> {
  return pipe(succeed(option), bind(O.match(() => fail(O.None()), succeed)))
}

export function fromRequest<R, E, A, B>(request: A & Request<E, B>, dataSource: DataSource<R, A>): Query<R, E, B> {
  return new Query(
    pipe(
      I.asksM(([_, qc]: readonly [R, QueryContext]) => qc.cache.lookup(request)),
      I.bind(
        E.match(
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
              I.map(O.match(() => Res.blocked(BRS.empty, Cont.make(request, dataSource, ref)), Res.fromEither))
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
      Ref.make(O.None<E.Either<E, B>>()),
      I.map((ref) =>
        Res.blocked(BRS.single(dataSource, BlockedRequest.make(request, ref)), Cont.make(request, dataSource, ref))
      )
    )
  )
}

export const never: Query<unknown, never, never> = fromEffect(I.never)

export function none<A = never>(): Query<unknown, never, O.Option<A>> {
  return succeed(O.None())
}

export function some<A>(a: A): Query<unknown, never, O.Option<A>> {
  return succeed(O.Some(a))
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<R, E, A, R1, E1, B>(ma: Query<R, E, A>, f: (a: A) => Query<R1, E1, B>): Query<R & R1, E | E1, B> {
  return new Query(
    I.bind_(
      ma.step,
      matchTag({
        Blocked: ({ blockedRequests, cont }) => I.succeed(Res.blocked(blockedRequests, Cont.mapM_(cont, f))),
        Done: ({ value }) => f(value).step,
        Fail: ({ cause }) => I.succeed(Res.fail(cause))
      })
    )
  )
}

export function bind<A, R1, E1, B>(
  f: (a: A) => Query<R1, E1, B>
): <R, E>(ma: Query<R, E, A>) => Query<R & R1, E | E1, B> {
  return (ma) => bind_(ma, f)
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
  return pipe(ask<R0>(), bind(f))
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

export function give<R>(r: Described<R>): <E, A, R0 = unknown>(ra: Query<R & R0, E, A>) => Query<R0, E, A> {
  return (ra) => give_(ra, r)
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
        Ex.matchM(
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
          Ex.matchM(
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

export function giveServiceM<T>(_: Tag<T>) {
  return <R, E>(f: Described<IO<R, E, T>>) => <R1, E1, A1>(ma: Query<R1 & Has<T>, E1, A1>): Query<R & R1, E | E1, A1> =>
    asksM((r: R & R1) =>
      bind_(fromEffect(f.value), (t) => giveAll_(ma, Described(mergeEnvironments(_, r, t), f.description)))
    )
}

export function giveService<T>(
  _: Tag<T>
): (f: Described<T>) => <R1, E1, A1>(ma: Query<R1 & Has<T>, E1, A1>) => Query<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(Described(I.succeed(f.value), f.description))(ma)
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
    flow(O.Some, fail),
    E.match(succeed, () => fail(O.None()))
  )
}

export function right<R, E, A, B>(ma: Query<R, E, E.Either<A, B>>): Query<R, O.Option<E>, B> {
  return foldM_(
    ma,
    flow(O.Some, fail),
    E.match(() => fail(O.None()), succeed)
  )
}

export function leftOrFail_<R, E, A, B, E1>(ma: Query<R, E, E.Either<A, B>>, e: E1): Query<R, E | E1, A> {
  return bind_(
    ma,
    E.match(succeed, () => fail(e))
  )
}

export function leftOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, A> {
  return (ma) => leftOrFail_(ma, e)
}

export function leftOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (right: B) => E1
): Query<R, E | E1, A> {
  return bind_(ma, E.match(succeed, flow(f, fail)))
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
      O.match(() => die(f(e)), fail)
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
  return bind_(
    ma,
    E.match(() => fail(e), succeed)
  )
}

export function rightOrFail<E1>(e: E1): <R, E, A, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFail_(ma, e)
}

export function rightOrFailWith_<R, E, A, B, E1>(
  ma: Query<R, E, E.Either<A, B>>,
  f: (left: A) => E1
): Query<R, E | E1, B> {
  return bind_(ma, E.match(flow(f, fail), succeed))
}

export function rightOrFailWith<A, E1>(
  f: (left: A) => E1
): <R, E, B>(ma: Query<R, E, E.Either<A, B>>) => Query<R, E | E1, B> {
  return (ma) => rightOrFailWith_(ma, f)
}

export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => crossWith_(b, f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreach<A, R, E, B>(f: (a: A) => Query<R, E, B>): (as: Iterable<A>) => Query<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function foreachPar_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Query<R, E, B>): Query<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) => crossWithPar_(b, f(a), (bs, b) => A.append(b)(bs)))
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
    It.foldl(succeed([]) as Query<R, E, ReadonlyArray<B>>, (b, a) =>
      crossWithBatched_(b, f(a), (bs, b) => A.append(b)(bs))
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
      O.match(() => none(), halt)
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
  return foldM_(ma, O.match(none, fail), some)
}

export function get<R, E, A>(ma: Query<R, E, O.Option<A>>): Query<R, O.Option<E>, A> {
  return foldM_(
    ma,
    flow(O.Some, fail),
    O.match(() => fail(O.None()), succeed)
  )
}

export function getOrFail_<R, E, A, E1>(ma: Query<R, E, O.Option<A>>, e: E1): Query<R, E | E1, A> {
  return bind_(
    ma,
    O.match(() => fail(e), succeed)
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
    cross(ma),
    crossWith(fromEffect(summary), ([start, value], end) => [f(start, end), value])
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
      O.match(() => pipe(cause, Ca.map(f), halt), fail)
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
