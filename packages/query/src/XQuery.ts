import type { Cache } from './Cache'
import type { DataSource } from './DataSource'
import type { DataSourceAspect } from './DataSourceAspect'
import type { Request } from './Request'
import type { IO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'

import * as A from '@principia/base/data/Array'
import * as E from '@principia/base/data/Either'
import { flow, identity, pipe, tuple } from '@principia/base/data/Function'
import * as It from '@principia/base/data/Iterable'
import * as O from '@principia/base/data/Option'
import { matchTag, matchTag_ } from '@principia/base/util/matchers'
import * as Ca from '@principia/io/Cause'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'

import { empty } from './Cache'
import { Described } from './Described'
import { BlockedRequest } from './internal/BlockedRequest'
import * as BRS from './internal/BlockedRequests'
import { QueryContext } from './internal/QueryContext'
import { QueryFailure } from './QueryFailure'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

// NOTE: Because of the circular nature of how ZIO defines methods on ZQuery, it is simplest
// to define class methods on `XQuery`, `Continue`, and `Result` in one single file.

/**
 * An `XQuery<R, E, A>` is a purely functional description of an effectual query
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
export class XQuery<R, E, A> {
  constructor(readonly step: IO<readonly [R, QueryContext], never, Result<R, E, A>>) {}

  map = <B>(f: (a: A) => B): XQuery<R, E, B> => {
    return new XQuery(I.map_(this.step, (r) => r.map(f)))
  }

  mapDataSources = <R1>(f: DataSourceAspect<R1>): XQuery<R & R1, E, A> => {
    return new XQuery(I.map_(this.step, (r) => r.mapDataSources(f)))
  }

  foldCauseM = <R1, E1, B>(
    onFailure: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>,
    onSuccess: (a: A) => XQuery<R1, E1, B>
  ): XQuery<R & R1, E1, B> => {
    return new XQuery(
      I.foldCauseM_(
        this.step,
        (_) => onFailure(_).step,
        matchTag({
          Blocked: ({ blockedRequests, cont }) =>
            I.succeed(blockedResult(blockedRequests, cont.foldCauseM(onFailure, onSuccess))),
          Done: ({ value }) => onSuccess(value).step,
          Fail: ({ cause }) => onFailure(cause).step
        })
      )
    )
  }

  foldM = <R1, E1, B>(
    onFailure: (e: E) => XQuery<R1, E1, B>,
    onSuccess: (a: A) => XQuery<R1, E1, B>
  ): XQuery<R & R1, E1, B> => {
    return this.foldCauseM(flow(Ca.failureOrCause, E.fold(onFailure, halt)), onSuccess)
  }

  fold = <B>(onFailure: (e: E) => B, onSuccess: (a: A) => B): XQuery<R, never, B> => {
    return this.foldM(
      (e) => succeed(onFailure(e)),
      (a) => succeed(onSuccess(a))
    )
  }

  bimap = <E1, B>(f: (e: E) => E1, g: (a: A) => B): XQuery<R, E1, B> => {
    return this.foldM(
      (e) => fail(f(e)),
      (a) => succeed(g(a))
    )
  }

  mapError = <E1>(f: (e: E) => E1): XQuery<R, E1, A> => {
    return this.bimap(f, identity)
  }

  flatMap = <R1, E1, B>(f: (a: A) => XQuery<R1, E1, B>): XQuery<R & R1, E | E1, B> => {
    return new XQuery(
      I.flatMap_(
        this.step,
        matchTag({
          Blocked: ({ blockedRequests, cont }) => I.succeed(blockedResult(blockedRequests, cont.mapM(f))),
          Done: ({ value }) => f(value).step,
          Fail: ({ cause }) => I.succeed(failResult(cause))
        })
      )
    )
  }

  gives = <R0>(f: Described<(r0: R0) => R>): XQuery<R0, E, A> => {
    return new XQuery(
      pipe(
        this.step,
        I.map((r) => r.gives(f)),
        I.gives(([r0, qc]) => [f.value(r0), qc] as const)
      )
    )
  }

  runCache = (cache: Cache): I.IO<R, E, A> => {
    return pipe(
      this.step,
      I.gives((r: R) => [r, new QueryContext(cache)] as const),
      I.flatMap(
        matchTag({
          Blocked: ({ blockedRequests, cont }) => I.andThen_(BRS.run_(blockedRequests, cache), cont.runCache(cache)),
          Done: ({ value }) => I.succeed(value),
          Fail: ({ cause }) => I.halt(cause)
        })
      )
    )
  }

  runLog = (): I.IO<R, E, readonly [Cache, A]> => {
    const runCache = this.runCache
    return I.gen(function* (_) {
      const cache = yield* _(empty)
      const a     = yield* _(runCache(cache))
      return [cache, a]
    })
  }

  run = (): I.IO<R, E, A> => {
    return I.map_(this.runLog(), ([_, a]) => a)
  }

  map2 = <R1, E1, B, C>(that: XQuery<R1, E1, B>, f: (a: A, b: B) => C): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.flatMap_(
        this.step,
        matchTag({
          Blocked: ({ blockedRequests, cont }) => {
            if (cont._tag === 'Effect') {
              return I.succeed(blockedResult(blockedRequests, effectContinue(cont.query.map2(that, f))))
            } else {
              return I.map_(
                that.step,
                matchTag({
                  Blocked: (br) => blockedResult(BRS.then(blockedRequests, br.blockedRequests), cont.map2(br.cont, f)),
                  Done: ({ value }) =>
                    blockedResult(
                      blockedRequests,
                      cont.map((a) => f(a, value))
                    ),
                  Fail: ({ cause }) => failResult(cause)
                })
              )
            }
          },
          Done: (a) =>
            I.map_(
              that.step,
              matchTag({
                Blocked: ({ blockedRequests, cont }) =>
                  blockedResult(
                    blockedRequests,
                    cont.map((b) => f(a.value, b))
                  ),
                Done: (b) => doneResult(f(a.value, b.value)),
                Fail: (e) => failResult(e.cause)
              })
            ),
          Fail: ({ cause }) => I.succeed(failResult(cause))
        })
      )
    )
  }

  map2Par = <R1, E1, B, C>(that: XQuery<R1, E1, B>, f: (a: A, b: B) => C): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.map2Par_(this.step, that.step, (ra, rb) => {
        return ra._tag === 'Blocked'
          ? rb._tag === 'Blocked'
            ? blockedResult(BRS.then(ra.blockedRequests, rb.blockedRequests), ra.cont.map2Par(rb.cont, f))
            : rb._tag === 'Done'
              ? blockedResult(
                ra.blockedRequests,
                ra.cont.map((a) => f(a, rb.value))
              )
              : failResult(rb.cause)
          : ra._tag === 'Done'
            ? rb._tag === 'Blocked'
              ? blockedResult(
                rb.blockedRequests,
                rb.cont.map((b) => f(ra.value, b))
              )
              : rb._tag === 'Done'
                ? doneResult(f(ra.value, rb.value))
                : failResult(rb.cause)
            : rb._tag === 'Fail'
              ? failResult(Ca.both(ra.cause, rb.cause))
              : failResult(ra.cause)
      })
    )
  }

  map2Batched = <R1, E1, B, C>(that: XQuery<R1, E1, B>, f: (a: A, b: B) => C): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.map2_(this.step, that.step, (ra, rb) => {
        return ra._tag === 'Blocked'
          ? rb._tag === 'Blocked'
            ? blockedResult(BRS.then(ra.blockedRequests, rb.blockedRequests), ra.cont.map2Batched(rb.cont, f))
            : rb._tag === 'Done'
              ? blockedResult(
                ra.blockedRequests,
                ra.cont.map((a) => f(a, rb.value))
              )
              : failResult(rb.cause)
          : ra._tag === 'Done'
            ? rb._tag === 'Blocked'
              ? blockedResult(
                rb.blockedRequests,
                rb.cont.map((b) => f(ra.value, b))
              )
              : rb._tag === 'Done'
                ? doneResult(f(ra.value, rb.value))
                : failResult(rb.cause)
            : rb._tag === 'Fail'
              ? failResult(Ca.both(ra.cause, rb.cause))
              : failResult(ra.cause)
      })
    )
  }
}

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

export function foldCauseM_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  onFailure: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, B> {
  return ma.foldCauseM(onFailure, onSuccess)
}

export function foldCauseM<E, A, R1, E1, B>(
  onFailure: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): <R>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, B> {
  return (ma) => ma.foldCauseM(onFailure, onSuccess)
}

export function foldM_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  onFailure: (error: E) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, B> {
  return ma.foldM(onFailure, onSuccess)
}

export function foldM<E, A, R1, E1, B>(
  onFailure: (error: E) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): <R>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, B> {
  return (ma) => ma.foldM(onFailure, onSuccess)
}

export function fold_<R, E, A, B>(
  ma: XQuery<R, E, A>,
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): XQuery<R, never, B> {
  return ma.fold(onFailure, onSuccess)
}

export function fold<E, A, B>(
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): <R>(ma: XQuery<R, E, A>) => XQuery<R, never, B> {
  return (ma) => ma.fold(onFailure, onSuccess)
}

export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  h: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, A | B> {
  return ma.foldCauseM<R1, E1, A | B>(h, succeed)
}

export function catchAllCause<E, R1, E1, B>(
  h: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>
): <R, A>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, A | B> {
  return <R, A>(ma: XQuery<R, E, A>) => ma.foldCauseM<R1, E1, A | B>(h, succeed)
}

export function catchAll_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  h: (e: E) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, A | B> {
  return ma.foldM<R1, E1, A | B>(h, succeed)
}

export function catchAll<E, R1, E1, B>(
  h: (e: E) => XQuery<R1, E1, B>
): <R, A>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, A | B> {
  return <R, A>(ma: XQuery<R, E, A>) => ma.foldM<R1, E1, A | B>(h, succeed)
}

/*
 * -------------------------------------------
 * Sequential Apply
 * -------------------------------------------
 */

export function map2_<R, E, A, R1, E1, B, C>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): XQuery<R & R1, E | E1, C> {
  return fa.map2(fb, f)
}

export function map2<A, R1, E1, B, C>(
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, C> {
  return (fa) => fa.map2(fb, f)
}

export function product_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, readonly [A, B]> {
  return map2_(fa, fb, tuple)
}

export function product<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

export function ap_<R, E, A, R1, E1, B>(
  fab: XQuery<R, E, (a: A) => B>,
  fa: XQuery<R1, E1, A>
): XQuery<R & R1, E | E1, B> {
  return map2_(fab, fa, (f, a) => f(a))
}

export function ap<R, E, A>(
  fa: XQuery<R, E, A>
): <R1, E1, B>(fab: XQuery<R1, E1, (a: A) => B>) => XQuery<R & R1, E | E1, B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<R, E, A, R1, E1, B>(fa: XQuery<R, E, A>, fb: XQuery<R1, E1, B>): XQuery<R & R1, E | E1, A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apFirst<R1, E1, B>(fb: XQuery<R1, E1, B>): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<R, E, A, R1, E1, B>(fa: XQuery<R, E, A>, fb: XQuery<R1, E1, B>): XQuery<R & R1, E | E1, B> {
  return map2_(fa, fb, (_, b) => b)
}

export function apSecond<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (fa) => apSecond_(fa, fb)
}

/*
 * -------------------------------------------
 * Parallel Apply
 * -------------------------------------------
 */

export function map2Par_<R, E, A, R1, E1, B, C>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): XQuery<R & R1, E | E1, C> {
  return fa.map2Par(fb, f)
}

export function map2Par<A, R1, E1, B, C>(
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, C> {
  return (fa) => fa.map2Par(fb, f)
}

export function productPar_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, readonly [A, B]> {
  return map2Par_(fa, fb, tuple)
}

export function productPar<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, readonly [A, B]> {
  return (fa) => productPar_(fa, fb)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: XQuery<R, E, (a: A) => B>,
  fa: XQuery<R1, E1, A>
): XQuery<R & R1, E | E1, B> {
  return map2Par_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: XQuery<R, E, A>
): <R1, E1, B>(fab: XQuery<R1, E1, (a: A) => B>) => XQuery<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function apFirstPar_<R, E, A, R1, E1, B>(fa: XQuery<R, E, A>, fb: XQuery<R1, E1, B>): XQuery<R & R1, E | E1, A> {
  return map2Par_(fa, fb, (a, _) => a)
}

export function apFirstPar<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, A> {
  return (fa) => apFirstPar_(fa, fb)
}

export function apSecondPar_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, B> {
  return map2Par_(fa, fb, (_, b) => b)
}

export function apSecondPar<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (fa) => apSecondPar_(fa, fb)
}

/*
 * -------------------------------------------
 * Batched Apply
 * -------------------------------------------
 */

export function map2Batched_<R, E, A, R1, E1, B, C>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): XQuery<R & R1, E | E1, C> {
  return fa.map2Batched(fb, f)
}

export function map2Batched<A, R1, E1, B, C>(
  fb: XQuery<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, C> {
  return (fa) => fa.map2Batched(fb, f)
}

export function productBatched_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, readonly [A, B]> {
  return map2Batched_(fa, fb, tuple)
}

export function productBatched<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, readonly [A, B]> {
  return (fa) => productBatched_(fa, fb)
}

export function apBatched_<R, E, A, R1, E1, B>(
  fab: XQuery<R, E, (a: A) => B>,
  fa: XQuery<R1, E1, A>
): XQuery<R & R1, E | E1, B> {
  return map2Batched_(fab, fa, (f, a) => f(a))
}

export function apBatched<R, E, A>(
  fa: XQuery<R, E, A>
): <R1, E1, B>(fab: XQuery<R1, E1, (a: A) => B>) => XQuery<R & R1, E | E1, B> {
  return (fab) => apBatched_(fab, fa)
}

export function apFirstBatched_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, A> {
  return map2Batched_(fa, fb, (a, _) => a)
}

export function apFirstBatched<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, A> {
  return (fa) => apFirstBatched_(fa, fb)
}

export function apSecondBatched_<R, E, A, R1, E1, B>(
  fa: XQuery<R, E, A>,
  fb: XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, B> {
  return map2Batched_(fa, fb, (_, b) => b)
}

export function apSecondBatched<R1, E1, B>(
  fb: XQuery<R1, E1, B>
): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (fa) => apSecondBatched_(fa, fb)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, E1, B>(pab: XQuery<R, E, A>, f: (e: E) => E1, g: (a: A) => B): XQuery<R, E1, B> {
  return pab.bimap(f, g)
}

export function bimap<E, A, E1, B>(f: (e: E) => E1, g: (a: A) => B): <R>(pab: XQuery<R, E, A>) => XQuery<R, E1, B> {
  return (pab) => pab.bimap(f, g)
}

export function mapError_<R, E, A, E1>(pab: XQuery<R, E, A>, f: (e: E) => E1): XQuery<R, E1, A> {
  return pab.mapError(f)
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(pab: XQuery<R, E, A>) => XQuery<R, E1, A> {
  return (pab) => pab.mapError(f)
}

export function mapErrorCause_<R, E, A, E1>(
  pab: XQuery<R, E, A>,
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): XQuery<R, E1, A> {
  return pab.foldCauseM(flow(h, halt), succeed)
}

export function mapErrorCause<E, E1>(
  h: (cause: Ca.Cause<E>) => Ca.Cause<E1>
): <R, A>(pab: XQuery<R, E, A>) => XQuery<R, E1, A> {
  return (pab) => mapErrorCause_(pab, h)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export function absolve<R, E, E1, A>(v: XQuery<R, E, E.Either<E1, A>>): XQuery<R, E | E1, A> {
  return v.flatMap(fromEither)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: XQuery<R, E, A>, f: (a: A) => B): XQuery<R, E, B> {
  return fa.map(f)
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: XQuery<R, E, A>) => XQuery<R, E, B> {
  return (fa) => fa.map(f)
}

export function as_<R, E, A, B>(fa: XQuery<R, E, A>, b: B): XQuery<R, E, B> {
  return fa.map(() => b)
}

export function as<B>(b: B): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R, E, B> {
  return (fa) => fa.map(() => b)
}

export function mapDataSources_<R, E, A, R1>(fa: XQuery<R, E, A>, f: DataSourceAspect<R1>): XQuery<R & R1, E, A> {
  return fa.mapDataSources(f)
}

export function mapDataSources<R1>(f: DataSourceAspect<R1>): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R & R1, E, A> {
  return (fa) => fa.mapDataSources(f)
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function succeed<A>(value: A): XQuery<unknown, never, A> {
  return new XQuery(I.succeed(doneResult(value)))
}

export function halt<E>(cause: Ca.Cause<E>): XQuery<unknown, E, never> {
  return new XQuery(I.succeed(failResult(cause)))
}

export function fail<E>(error: E): XQuery<unknown, E, never> {
  return halt(Ca.fail(error))
}

export function die(error: unknown): XQuery<unknown, never, never> {
  return new XQuery(I.die(error))
}

export function fromEffect<R, E, A>(effect: IO<R, E, A>): XQuery<R, E, A> {
  return new XQuery(
    pipe(
      effect,
      I.foldCause(failResult, doneResult),
      I.gives(([r, _]) => r)
    )
  )
}

export function fromEither<E, A>(either: E.Either<E, A>): XQuery<unknown, E, A> {
  return succeed(either).flatMap(E.fold(fail, succeed))
}

export function fromOption<A>(option: O.Option<A>): XQuery<unknown, O.Option<never>, A> {
  return succeed(option).flatMap(O.fold(() => fail(O.none()), succeed))
}

export function fromRequest<R, E, A, B>(request: A & Request<E, B>, dataSource: DataSource<R, A>): XQuery<R, E, B> {
  return new XQuery(
    pipe(
      I.asksM(([_, qc]: readonly [R, QueryContext]) => qc.cache.lookup(request)),
      I.flatMap(
        E.fold(
          (ref) =>
            I.succeed(
              blockedResult(
                BRS.single(dataSource, BlockedRequest.apply(request, ref)),
                makeContinue(request, dataSource, ref)
              )
            ),
          (ref) =>
            pipe(
              ref.get,
              I.map(
                O.fold(
                  () => blockedResult(BRS.empty, makeContinue(request, dataSource, ref)),
                  (b) => resultFromEither(b)
                )
              )
            )
        )
      )
    )
  )
}

export function fromRequestUncached<R, E, A, B>(
  request: A & Request<E, B>,
  dataSource: DataSource<R, A>
): XQuery<R, E, B> {
  return new XQuery(
    pipe(
      Ref.make(O.none<E.Either<E, B>>()),
      I.map((ref) =>
        blockedResult(
          BRS.single(dataSource, BlockedRequest.apply(request, ref)),
          makeContinue(request, dataSource, ref)
        )
      )
    )
  )
}

export const never: XQuery<unknown, never, never> = fromEffect(I.never)

export function none<A = never>(): XQuery<unknown, never, O.Option<A>> {
  return succeed(O.none())
}

export function some<A>(a: A): XQuery<unknown, never, O.Option<A>> {
  return succeed(O.some(a))
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  f: (a: A) => XQuery<R1, E1, B>
): XQuery<R & R1, E | E1, B> {
  return ma.flatMap(f)
}

export function flatMap<A, R1, E1, B>(
  f: (a: A) => XQuery<R1, E1, B>
): <R, E>(ma: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (ma) => ma.flatMap(f)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): XQuery<R, never, R> {
  return fromEffect(I.ask())
}

export function asks<R, A>(f: (_: R) => A): XQuery<R, never, A> {
  return ask<R>().map(f)
}

export function asksM<R0, R, E, A>(f: (_: R0) => XQuery<R, E, A>): XQuery<R0 & R, E, A> {
  return ask<R0>().flatMap(f)
}

export function gives_<R, E, A, R0>(ra: XQuery<R, E, A>, f: Described<(r0: R0) => R>): XQuery<R0, E, A> {
  return ra.gives(f)
}

export function gives<R, R0>(f: Described<(r0: R0) => R>): <E, A>(ra: XQuery<R, E, A>) => XQuery<R0, E, A> {
  return (ra) => ra.gives(f)
}

export function giveAll_<R, E, A>(ra: XQuery<R, E, A>, r: Described<R>): XQuery<unknown, E, A> {
  return ra.gives(Described(() => r.value, `() => ${r.description}`))
}

export function giveAll<R>(r: Described<R>): <E, A>(ra: XQuery<R, E, A>) => XQuery<unknown, E, A> {
  return (ra) => giveAll_(ra, r)
}

export function give_<E, A, R = unknown, R0 = unknown>(ra: XQuery<R & R0, E, A>, r: Described<R>): XQuery<R0, E, A> {
  return ra.gives(Described((r0: R0) => ({ ...r0, ...r.value }), r.description))
}

export function giveLayer_<R, E, A, R1, E1, A1>(
  ra: XQuery<R & A1, E, A>,
  layer: Described<L.Layer<R1, E1, A1>>
): XQuery<R & R1, E | E1, A> {
  return new XQuery(
    pipe(
      L.build(layer.value),
      M.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
      M.result,
      M.use(
        Ex.foldM(
          (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(failResult(c)),
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
): <R, E, A>(ra: XQuery<R & A1, E, A>) => XQuery<R & R1, E | E1, A> {
  return <R, E, A>(ra: XQuery<R & A1, E, A>) =>
    new XQuery(
      pipe(
        L.build(layer.value),
        M.gives(([r1, _]: readonly [R1, QueryContext]) => r1),
        M.result,
        M.use(
          Ex.foldM(
            (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> => I.succeed(failResult(c)),
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
  f: (a: A) => XQuery<R, E, B>
): XQuery<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return foreach_(as, flow(f, recover)).map(A.partitionMap(identity))
}

export function partitionM<A, R, E, B>(
  f: (a: A) => XQuery<R, E, B>
): (as: Iterable<A>) => XQuery<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitionM_(as, f)
}

export function partitonParM_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => XQuery<R, E, B>
): XQuery<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return foreachPar_(as, flow(f, recover)).map(A.partitionMap(identity))
}

export function partitionParM<A, R, E, B>(
  f: (a: A) => XQuery<R, E, B>
): (as: Iterable<A>) => XQuery<R, never, readonly [ReadonlyArray<E>, ReadonlyArray<B>]> {
  return (as) => partitonParM_(as, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function recover<R, E, A>(ma: XQuery<R, E, A>): XQuery<R, never, E.Either<E, A>> {
  return ma.fold(
    (e) => E.left(e),
    (a) => E.right(a)
  )
}

export function left<R, E, A, B>(ma: XQuery<R, E, E.Either<A, B>>): XQuery<R, O.Option<E>, A> {
  return ma.foldM(
    flow(O.some, fail),
    E.fold(succeed, () => fail(O.none()))
  )
}

export function right<R, E, A, B>(ma: XQuery<R, E, E.Either<A, B>>): XQuery<R, O.Option<E>, B> {
  return ma.foldM(
    flow(O.some, fail),
    E.fold(() => fail(O.none()), succeed)
  )
}

export function leftOrFail_<R, E, A, B, E1>(ma: XQuery<R, E, E.Either<A, B>>, e: E1): XQuery<R, E | E1, A> {
  return ma.flatMap(E.fold(succeed, () => fail(e)))
}

export function leftOrFail<E1>(e: E1): <R, E, A, B>(ma: XQuery<R, E, E.Either<A, B>>) => XQuery<R, E | E1, A> {
  return (ma) => leftOrFail_(ma, e)
}

export function leftOrFailWith_<R, E, A, B, E1>(
  ma: XQuery<R, E, E.Either<A, B>>,
  f: (right: B) => E1
): XQuery<R, E | E1, A> {
  return ma.flatMap(E.fold(succeed, flow(f, fail)))
}

export function leftOrFailWith<B, E1>(
  f: (right: B) => E1
): <R, E, A>(ma: XQuery<R, E, E.Either<A, B>>) => XQuery<R, E | E1, A> {
  return (ma) => leftOrFailWith_(ma, f)
}

export function rightOrFail_<R, E, A, B, E1>(ma: XQuery<R, E, E.Either<A, B>>, e: E1): XQuery<R, E | E1, B> {
  return ma.flatMap(E.fold(() => fail(e), succeed))
}

export function rightOrFail<E1>(e: E1): <R, E, A, B>(ma: XQuery<R, E, E.Either<A, B>>) => XQuery<R, E | E1, B> {
  return (ma) => rightOrFail_(ma, e)
}

export function rightOrFailWith_<R, E, A, B, E1>(
  ma: XQuery<R, E, E.Either<A, B>>,
  f: (left: A) => E1
): XQuery<R, E | E1, B> {
  return ma.flatMap(E.fold(flow(f, fail), succeed))
}

export function rightOrFailWith<A, E1>(
  f: (left: A) => E1
): <R, E, B>(ma: XQuery<R, E, E.Either<A, B>>) => XQuery<R, E | E1, B> {
  return (ma) => rightOrFailWith_(ma, f)
}

export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => XQuery<R, E, B>): XQuery<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as XQuery<R, E, ReadonlyArray<B>>, (b, a) => b.map2(f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreach<A, R, E, B>(f: (a: A) => XQuery<R, E, B>): (as: Iterable<A>) => XQuery<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function foreachPar_<A, R, E, B>(as: Iterable<A>, f: (a: A) => XQuery<R, E, B>): XQuery<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as XQuery<R, E, ReadonlyArray<B>>, (b, a) => b.map2Par(f(a), (bs, b) => A.append(b)(bs)))
  )
}

export function foreachPar<A, R, E, B>(
  f: (a: A) => XQuery<R, E, B>
): (as: Iterable<A>) => XQuery<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f)
}

export function foreachBatched_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => XQuery<R, E, B>
): XQuery<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as XQuery<R, E, ReadonlyArray<B>>, (b, a) =>
      b.map2Batched(f(a), (bs, b) => A.append(b)(bs))
    )
  )
}

export function foreachBatched<A, R, E, B>(
  f: (a: A) => XQuery<R, E, B>
): (as: Iterable<A>) => XQuery<R, E, ReadonlyArray<B>> {
  return (as) => foreachBatched_(as, f)
}

export function optional<R, E, A>(ma: XQuery<R, E, A>): XQuery<R, E, O.Option<A>> {
  return ma.foldCauseM(
    flow(
      Ca.stripSomeDefects((_) => !(_ instanceof QueryFailure)),
      O.fold(() => none(), halt)
    ),
    some
  )
}

export function orDieWith_<R, E, A>(ma: XQuery<R, E, A>, f: (e: E) => unknown): XQuery<R, never, A> {
  return ma.foldM(flow(f, die), succeed)
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: XQuery<R, E, A>) => XQuery<R, never, A> {
  return (ma) => ma.foldM(flow(f, die), succeed)
}

export function orDie<R, E, A>(ma: XQuery<R, E, A>): XQuery<R, never, A> {
  return orDieWith_(ma, identity)
}

export function sandbox<R, E, A>(ma: XQuery<R, E, A>): XQuery<R, Ca.Cause<E>, A> {
  return ma.foldCauseM(fail, succeed)
}

export function unsandbox<R, E, A>(v: XQuery<R, Ca.Cause<E>, A>): XQuery<R, E, A> {
  return mapErrorCause_(v, Ca.flatten)
}

export function sandboxWith_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  f: (query: XQuery<R, Ca.Cause<E>, A>) => XQuery<R1, Ca.Cause<E1>, B>
): XQuery<R & R1, E | E1, B> {
  return unsandbox(f(sandbox(ma)))
}

export function sandboxWith<R, E, A, R1, E1, B>(
  f: (query: XQuery<R, Ca.Cause<E>, A>) => XQuery<R1, Ca.Cause<E1>, B>
): (ma: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (ma) => sandboxWith_(ma, f)
}

export function summarized_<R, E, A, R1, E1, B, C>(
  ma: XQuery<R, E, A>,
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): XQuery<R & R1, E | E1, readonly [C, A]> {
  return pipe(
    fromEffect(summary),
    product(ma),
    map2(fromEffect(summary), ([start, value], end) => [f(start, end), value])
  )
}

export function summarized<R1, E1, B, C>(
  summary: I.IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(ma: XQuery<R, E, A>) => XQuery<R & R1, E | E1, readonly [C, A]> {
  return (ma) => summarized_(ma, summary, f)
}

export function unrefineWith_<R, E, A, E1>(
  ma: XQuery<R, E, A>,
  pf: (error: unknown) => O.Option<E1>,
  f: (e: E) => E1
): XQuery<R, E1, A> {
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
): <R, A>(ma: XQuery<R, E, A>) => XQuery<R, E1, A> {
  return (ma) => unrefineWith_(ma, pf, f)
}

export function unrefine_<R, E, A>(ma: XQuery<R, E, A>, pf: (error: unknown) => O.Option<E>): XQuery<R, E, A> {
  return unrefineWith_(ma, pf, identity)
}

export function unrefine<E>(pf: (error: unknown) => O.Option<E>): <R, A>(ma: XQuery<R, E, A>) => XQuery<R, E, A> {
  return (ma) => unrefine_(ma, pf)
}

/*
 * -------------------------------------------
 * Continue
 * -------------------------------------------
 */

abstract class AbstractContinue {
  foldCauseM<R, E, A, R1, E1, B>(
    this: Continue<R, E, A>,
    onFailure: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>,
    onSuccess: (a: A) => XQuery<R1, E1, B>
  ): Continue<R & R1, E1, B> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.foldCauseM(onFailure, onSuccess)),
      Get: ({ io }) => pipe(fromEffect(io), (q) => q.foldCauseM(onFailure, onSuccess), effectContinue)
    })
  }

  map<R, E, A, B>(this: Continue<R, E, A>, f: (a: A) => B): Continue<R, E, B> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.map(f)),
      Get: ({ io }) => getContinue(I.map_(io, f))
    })
  }

  mapDataSources<R, E, A, R1>(this: Continue<R, E, A>, f: DataSourceAspect<R1>): Continue<R & R1, E, A> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.mapDataSources(f)),
      Get: ({ io }) => getContinue(io)
    })
  }

  mapM<R, E, A, R1, E1, B>(this: Continue<R, E, A>, f: (a: A) => XQuery<R1, E1, B>): Continue<R & R1, E | E1, B> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.flatMap(f)),
      Get: ({ io }) => effectContinue(fromEffect(io).flatMap(f))
    })
  }

  mapError<R, E, A, E1>(this: Continue<R, E, A>, f: (e: E) => E1): Continue<R, E1, A> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.mapError(f)),
      Get: ({ io }) => pipe(io, I.mapError(f), getContinue)
    })
  }

  gives<R, E, A, R0>(this: Continue<R, E, A>, f: Described<(r0: R0) => R>): Continue<R0, E, A> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.gives(f)),
      Get: ({ io }) => getContinue(io)
    })
  }

  runCache<R, E, A>(this: Continue<R, E, A>, cache: Cache): I.IO<R, E, A> {
    return matchTag_(this, {
      Effect: ({ query }) => query.runCache(cache),
      Get: ({ io }) => io
    })
  }

  map2<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === 'Effect'
      ? that._tag === 'Effect'
        ? effectContinue(this.query.map2(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === 'Effect'
        ? effectContinue(fromEffect(this.io).map2(that.query, f))
        : getContinue(I.map2_(this.io, that.io, f))
  }

  map2Par<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === 'Effect'
      ? that._tag === 'Effect'
        ? effectContinue(this.query.map2Par(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === 'Effect'
        ? effectContinue(fromEffect(this.io).map2(that.query, f))
        : getContinue(I.map2_(this.io, that.io, f))
  }

  map2Batched<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === 'Effect'
      ? that._tag === 'Effect'
        ? effectContinue(this.query.map2Batched(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === 'Effect'
        ? effectContinue(fromEffect(this.io).map2(that.query, f))
        : getContinue(I.map2_(this.io, that.io, f))
  }
}

export class Effect<R, E, A> extends AbstractContinue {
  readonly _tag = 'Effect'
  constructor(readonly query: XQuery<R, E, A>) {
    super()
  }
}

export function effectContinue<R, E, A>(query: XQuery<R, E, A>): Continue<R, E, A> {
  return new Effect(query)
}

export class Get<E, A> extends AbstractContinue {
  readonly _tag = 'Get'
  constructor(readonly io: I.FIO<E, A>) {
    super()
  }
}

export function getContinue<E, A>(io: I.FIO<E, A>): Continue<unknown, E, A> {
  return new Get(io)
}

export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>

function makeContinue<R, E, A extends Request<E, B>, B>(
  request: A,
  dataSource: DataSource<R, A>,
  ref: URef<O.Option<E.Either<E, B>>>
): Continue<R, E, B> {
  return getContinue(
    pipe(
      ref.get,
      I.flatMap(
        O.fold(
          () => I.die('TODO: Query Failure'),
          (a) => I.fromEither(() => a)
        )
      )
    )
  )
}

/*
 * -------------------------------------------
 * Result
 * -------------------------------------------
 */

abstract class AbstractResult {
  map<R, E, A, B>(this: Result<R, E, A>, f: (a: A) => B): Result<R, E, B> {
    return matchTag_(this, {
      Blocked: ({ blockedRequests, cont }) => blockedResult(blockedRequests, cont.map(f)),
      Fail: ({ cause }) => failResult(cause),
      Done: ({ value }) => doneResult(f(value))
    })
  }

  gives<R, E, A, R0>(this: Result<R, E, A>, f: Described<(r0: R0) => R>): Result<R0, E, A> {
    return matchTag_(this, {
      Blocked: ({ blockedRequests, cont }) => blockedResult(BRS.gives_(blockedRequests, f), cont.gives(f)),
      Fail: ({ cause }) => failResult(cause),
      Done: ({ value }) => doneResult(value)
    })
  }

  mapDataSources<R, E, A, R1>(this: Result<R, E, A>, f: DataSourceAspect<R1>): Result<R & R1, E, A> {
    return matchTag_(this, {
      Blocked: ({ blockedRequests, cont }) =>
        blockedResult(BRS.mapDataSources(blockedRequests, f), cont.mapDataSources(f)),
      Done: ({ value }) => doneResult(value),
      Fail: ({ cause }) => failResult(cause)
    })
  }
}

export class Blocked<R, E, A> extends AbstractResult {
  readonly _tag = 'Blocked'
  constructor(readonly blockedRequests: BRS.BlockedRequests<R>, readonly cont: Continue<R, E, A>) {
    super()
  }
}

export class Done<A> extends AbstractResult {
  readonly _tag = 'Done'
  constructor(readonly value: A) {
    super()
  }
}

export class Fail<E> extends AbstractResult {
  readonly _tag = 'Fail'
  constructor(readonly cause: Ca.Cause<E>) {
    super()
  }
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>

export function blockedResult<R, E, A>(
  blockedRequests: BRS.BlockedRequests<R>,
  cont: Continue<R, E, A>
): Result<R, E, A> {
  return new Blocked(blockedRequests, cont)
}

export function failResult<E>(cause: Ca.Cause<E>): Result<unknown, E, never> {
  return new Fail(cause)
}

export function doneResult<A>(value: A): Done<A> {
  return new Done(value)
}

export function resultFromEither<E, A>(either: E.Either<E, A>): Result<unknown, E, A> {
  return E.fold_(
    either,
    (e) => failResult(Ca.fail(e)),
    (a) => doneResult(a)
  )
}
