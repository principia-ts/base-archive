import type { Cache } from "./Cache";
import type { DataSource } from "./DataSource";
import type { Request } from "./Request";
import type { IO } from "@principia/io/IO";
import type { URef } from "@principia/io/IORef";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { flow, identity, pipe } from "@principia/base/data/Function";
import * as It from "@principia/base/data/Iterable";
import * as O from "@principia/base/data/Option";
import { matchTag, matchTag_ } from "@principia/base/util/matchers";
import * as Ca from "@principia/io/Cause";
import * as Ex from "@principia/io/Exit";
import * as I from "@principia/io/IO";
import * as L from "@principia/io/Layer";
import * as M from "@principia/io/Managed";

import { empty } from "./Cache";
import { Described } from "./Described";
import { BlockedRequest } from "./internal/BlockedRequest";
import * as BRS from "./internal/BlockedRequests";
import { QueryContext } from "./internal/QueryContext";

export class XQuery<R, E, A> {
  constructor(readonly step: IO<readonly [R, QueryContext], never, Result<R, E, A>>) {}

  map = <B>(f: (a: A) => B): XQuery<R, E, B> => {
    return new XQuery(I.map_(this.step, (r) => r.map(f)));
  };

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
    );
  };

  foldM = <R1, E1, B>(
    onFailure: (e: E) => XQuery<R1, E1, B>,
    onSuccess: (a: A) => XQuery<R1, E1, B>
  ): XQuery<R & R1, E1, B> => {
    return this.foldCauseM(flow(Ca.failureOrCause, E.fold(onFailure, halt)), onSuccess);
  };

  fold = <B>(onFailure: (e: E) => B, onSuccess: (a: A) => B): XQuery<R, never, B> => {
    return this.foldM(
      (e) => succeed(onFailure(e)),
      (a) => succeed(onSuccess(a))
    );
  };

  bimap = <E1, B>(f: (e: E) => E1, g: (a: A) => B): XQuery<R, E1, B> => {
    return this.foldM(
      (e) => fail(f(e)),
      (a) => succeed(g(a))
    );
  };

  mapError = <E1>(f: (e: E) => E1): XQuery<R, E1, A> => {
    return this.bimap(f, identity);
  };

  flatMap = <R1, E1, B>(f: (a: A) => XQuery<R1, E1, B>): XQuery<R & R1, E | E1, B> => {
    return new XQuery(
      I.flatMap_(
        this.step,
        matchTag({
          Blocked: ({ blockedRequests, cont }) =>
            I.succeed(blockedResult(blockedRequests, cont.mapM(f))),
          Done: ({ value }) => f(value).step,
          Fail: ({ cause }) => I.succeed(failResult(cause))
        })
      )
    );
  };

  gives = <R0>(f: Described<(r0: R0) => R>): XQuery<R0, E, A> => {
    return new XQuery(
      pipe(
        this.step,
        I.map((r) => r.gives(f)),
        I.gives(([r0, qc]) => [f.value(r0), qc] as const)
      )
    );
  };

  runCache = (cache: Cache): I.IO<R, E, A> => {
    return pipe(
      this.step,
      I.gives((r: R) => [r, new QueryContext(cache)] as const),
      I.flatMap(
        matchTag({
          Blocked: ({ blockedRequests, cont }) =>
            I.andThen_(BRS.run_(blockedRequests, cache), cont.runCache(cache)),
          Done: ({ value }) => I.succeed(value),
          Fail: ({ cause }) => I.halt(cause)
        })
      )
    );
  };

  runLog = (): I.IO<R, E, readonly [Cache, A]> => {
    const runCache = this.runCache;
    return I.gen(function* (_) {
      const cache = yield* _(empty);
      const a = yield* _(runCache(cache));
      return [cache, a];
    });
  };

  run = (): I.IO<R, E, A> => {
    return I.map_(this.runLog(), ([_, a]) => a);
  };

  map2 = <R1, E1, B, C>(
    that: XQuery<R1, E1, B>,
    f: (a: A, b: B) => C
  ): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.flatMap_(
        this.step,
        matchTag({
          Blocked: ({ blockedRequests, cont }) => {
            if (cont._tag === "Effect") {
              return I.succeed(
                blockedResult(blockedRequests, effectContinue(cont.query.map2(that, f)))
              );
            } else {
              return I.map_(
                that.step,
                matchTag({
                  Blocked: (br) =>
                    blockedResult(
                      BRS.then(blockedRequests, br.blockedRequests),
                      cont.map2(br.cont, f)
                    ),
                  Done: ({ value }) =>
                    blockedResult(
                      blockedRequests,
                      cont.map((a) => f(a, value))
                    ),
                  Fail: ({ cause }) => failResult(cause)
                })
              );
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
    );
  };

  map2Par = <R1, E1, B, C>(
    that: XQuery<R1, E1, B>,
    f: (a: A, b: B) => C
  ): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.map2Par_(this.step, that.step, (ra, rb) => {
        return ra._tag === "Blocked"
          ? rb._tag === "Blocked"
            ? blockedResult(
                BRS.then(ra.blockedRequests, rb.blockedRequests),
                ra.cont.map2Par(rb.cont, f)
              )
            : rb._tag === "Done"
            ? blockedResult(
                ra.blockedRequests,
                ra.cont.map((a) => f(a, rb.value))
              )
            : failResult(rb.cause)
          : ra._tag === "Done"
          ? rb._tag === "Blocked"
            ? blockedResult(
                rb.blockedRequests,
                rb.cont.map((b) => f(ra.value, b))
              )
            : rb._tag === "Done"
            ? doneResult(f(ra.value, rb.value))
            : failResult(rb.cause)
          : rb._tag === "Fail"
          ? failResult(Ca.both(ra.cause, rb.cause))
          : failResult(ra.cause);
      })
    );
  };

  map2Batched = <R1, E1, B, C>(
    that: XQuery<R1, E1, B>,
    f: (a: A, b: B) => C
  ): XQuery<R & R1, E | E1, C> => {
    return new XQuery(
      I.map2_(this.step, that.step, (ra, rb) => {
        return ra._tag === "Blocked"
          ? rb._tag === "Blocked"
            ? blockedResult(
                BRS.then(ra.blockedRequests, rb.blockedRequests),
                ra.cont.map2Batched(rb.cont, f)
              )
            : rb._tag === "Done"
            ? blockedResult(
                ra.blockedRequests,
                ra.cont.map((a) => f(a, rb.value))
              )
            : failResult(rb.cause)
          : ra._tag === "Done"
          ? rb._tag === "Blocked"
            ? blockedResult(
                rb.blockedRequests,
                rb.cont.map((b) => f(ra.value, b))
              )
            : rb._tag === "Done"
            ? doneResult(f(ra.value, rb.value))
            : failResult(rb.cause)
          : rb._tag === "Fail"
          ? failResult(Ca.both(ra.cause, rb.cause))
          : failResult(ra.cause);
      })
    );
  };
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
  return ma.foldCauseM(onFailure, onSuccess);
}

export function foldCauseM<E, A, R1, E1, B>(
  onFailure: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): <R>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, B> {
  return (ma) => ma.foldCauseM(onFailure, onSuccess);
}

export function foldM_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  onFailure: (error: E) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, B> {
  return ma.foldM(onFailure, onSuccess);
}

export function foldM<E, A, R1, E1, B>(
  onFailure: (error: E) => XQuery<R1, E1, B>,
  onSuccess: (a: A) => XQuery<R1, E1, B>
): <R>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, B> {
  return (ma) => ma.foldM(onFailure, onSuccess);
}

export function fold_<R, E, A, B>(
  ma: XQuery<R, E, A>,
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): XQuery<R, never, B> {
  return ma.fold(onFailure, onSuccess);
}

export function fold<E, A, B>(
  onFailure: (error: E) => B,
  onSuccess: (a: A) => B
): <R>(ma: XQuery<R, E, A>) => XQuery<R, never, B> {
  return (ma) => ma.fold(onFailure, onSuccess);
}

export function catchAllCause_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  h: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, A | B> {
  return ma.foldCauseM<R1, E1, A | B>(h, succeed);
}

export function catchAllCause<E, R1, E1, B>(
  h: (cause: Ca.Cause<E>) => XQuery<R1, E1, B>
): <R, A>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, A | B> {
  return <R, A>(ma: XQuery<R, E, A>) => ma.foldCauseM<R1, E1, A | B>(h, succeed);
}

export function catchAll_<R, E, A, R1, E1, B>(
  ma: XQuery<R, E, A>,
  h: (e: E) => XQuery<R1, E1, B>
): XQuery<R & R1, E1, A | B> {
  return ma.foldM<R1, E1, A | B>(h, succeed);
}

export function catchAll<E, R1, E1, B>(
  h: (e: E) => XQuery<R1, E1, B>
): <R, A>(ma: XQuery<R, E, A>) => XQuery<R & R1, E1, A | B> {
  return <R, A>(ma: XQuery<R, E, A>) => ma.foldM<R1, E1, A | B>(h, succeed);
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<R, E, A, E1, B>(
  pab: XQuery<R, E, A>,
  f: (e: E) => E1,
  g: (a: A) => B
): XQuery<R, E1, B> {
  return pab.bimap(f, g);
}

export function bimap<E, A, E1, B>(
  f: (e: E) => E1,
  g: (a: A) => B
): <R>(pab: XQuery<R, E, A>) => XQuery<R, E1, B> {
  return (pab) => pab.bimap(f, g);
}

export function mapError_<R, E, A, E1>(pab: XQuery<R, E, A>, f: (e: E) => E1): XQuery<R, E1, A> {
  return pab.mapError(f);
}

export function mapError<E, E1>(f: (e: E) => E1): <R, A>(pab: XQuery<R, E, A>) => XQuery<R, E1, A> {
  return (pab) => pab.mapError(f);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: XQuery<R, E, A>, f: (a: A) => B): XQuery<R, E, B> {
  return fa.map(f);
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: XQuery<R, E, A>) => XQuery<R, E, B> {
  return (fa) => fa.map(f);
}

export function as_<R, E, A, B>(fa: XQuery<R, E, A>, b: B): XQuery<R, E, B> {
  return fa.map(() => b);
}

export function as<B>(b: B): <R, E, A>(fa: XQuery<R, E, A>) => XQuery<R, E, B> {
  return (fa) => fa.map(() => b);
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function succeed<A>(value: A): XQuery<unknown, never, A> {
  return new XQuery(I.succeed(doneResult(value)));
}

export function halt<E>(cause: Ca.Cause<E>): XQuery<unknown, E, never> {
  return new XQuery(I.succeed(failResult(cause)));
}

export function fail<E>(error: E): XQuery<unknown, E, never> {
  return halt(Ca.fail(error));
}

export function die(error: unknown): XQuery<unknown, never, never> {
  return new XQuery(I.die(error));
}

export function fromEffect<R, E, A>(effect: IO<R, E, A>): XQuery<R, E, A> {
  return new XQuery(
    pipe(
      effect,
      I.foldCause(failResult, doneResult),
      I.gives(([r, _]) => r)
    )
  );
}

export function fromRequest<R, E, A, B>(
  request: A & Request<E, B>,
  dataSource: DataSource<R, A>
): XQuery<R, E, B> {
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
  );
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
  return ma.flatMap(f);
}

export function flatMap<A, R1, E1, B>(
  f: (a: A) => XQuery<R1, E1, B>
): <R, E>(ma: XQuery<R, E, A>) => XQuery<R & R1, E | E1, B> {
  return (ma) => ma.flatMap(f);
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function gives_<R, E, A, R0>(
  ra: XQuery<R, E, A>,
  f: Described<(r0: R0) => R>
): XQuery<R0, E, A> {
  return ra.gives(f);
}

export function gives<R, R0>(
  f: Described<(r0: R0) => R>
): <E, A>(ra: XQuery<R, E, A>) => XQuery<R0, E, A> {
  return (ra) => ra.gives(f);
}

export function giveAll_<R, E, A>(ra: XQuery<R, E, A>, r: Described<R>): XQuery<unknown, E, A> {
  return ra.gives(Described(() => r.value, `() => ${r.description}`));
}

export function giveAll<R>(r: Described<R>): <E, A>(ra: XQuery<R, E, A>) => XQuery<unknown, E, A> {
  return (ra) => giveAll_(ra, r);
}

export function give_<E, A, R = unknown, R0 = unknown>(
  ra: XQuery<R & R0, E, A>,
  r: Described<R>
): XQuery<R0, E, A> {
  return ra.gives(Described((r0: R0) => ({ ...r0, ...r.value }), r.description));
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
          (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> =>
            I.succeed(failResult(c)),
          (r) =>
            gives_(
              ra,
              Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
            ).step
        )
      )
    )
  );
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
            (c): IO<readonly [R & R1, QueryContext], never, Result<R & R1, E | E1, A>> =>
              I.succeed(failResult(c)),
            (r) =>
              gives_(
                ra,
                Described((r0: R & R1) => ({ ...r0, ...r }), layer.description)
              ).step
          )
        )
      )
    );
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function foreachPar_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => XQuery<R, E, B>
): XQuery<R, E, ReadonlyArray<B>> {
  return pipe(
    as,
    It.foldLeft(succeed([]) as XQuery<R, E, ReadonlyArray<B>>, (b, a) =>
      b.map2Par(f(a), (bs, b) => A.append(b)(bs))
    )
  );
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
      Get: ({ io }) =>
        pipe(fromEffect(io), (q) => q.foldCauseM(onFailure, onSuccess), effectContinue)
    });
  }

  map<R, E, A, B>(this: Continue<R, E, A>, f: (a: A) => B): Continue<R, E, B> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.map(f)),
      Get: ({ io }) => getContinue(I.map_(io, f))
    });
  }

  mapM<R, E, A, R1, E1, B>(
    this: Continue<R, E, A>,
    f: (a: A) => XQuery<R1, E1, B>
  ): Continue<R & R1, E | E1, B> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.flatMap(f)),
      Get: ({ io }) => effectContinue(fromEffect(io).flatMap(f))
    });
  }

  mapError<R, E, A, E1>(this: Continue<R, E, A>, f: (e: E) => E1): Continue<R, E1, A> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.mapError(f)),
      Get: ({ io }) => pipe(io, I.mapError(f), getContinue)
    });
  }

  gives<R, E, A, R0>(this: Continue<R, E, A>, f: Described<(r0: R0) => R>): Continue<R0, E, A> {
    return matchTag_(this, {
      Effect: ({ query }) => effectContinue(query.gives(f)),
      Get: ({ io }) => getContinue(io)
    });
  }

  runCache<R, E, A>(this: Continue<R, E, A>, cache: Cache): I.IO<R, E, A> {
    return matchTag_(this, {
      Effect: ({ query }) => query.runCache(cache),
      Get: ({ io }) => io
    });
  }

  map2<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === "Effect"
      ? that._tag === "Effect"
        ? effectContinue(this.query.map2(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === "Effect"
      ? effectContinue(fromEffect(this.io).map2(that.query, f))
      : getContinue(I.map2_(this.io, that.io, f));
  }

  map2Par<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === "Effect"
      ? that._tag === "Effect"
        ? effectContinue(this.query.map2Par(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === "Effect"
      ? effectContinue(fromEffect(this.io).map2(that.query, f))
      : getContinue(I.map2_(this.io, that.io, f));
  }

  map2Batched<R, E, A, R1, E1, B, C>(
    this: Continue<R, E, A>,
    that: Continue<R1, E1, B>,
    f: (a: A, b: B) => C
  ): Continue<R & R1, E | E1, C> {
    return this._tag === "Effect"
      ? that._tag === "Effect"
        ? effectContinue(this.query.map2Batched(that.query, f))
        : effectContinue(this.query.map2(fromEffect(that.io), f))
      : that._tag === "Effect"
      ? effectContinue(fromEffect(this.io).map2(that.query, f))
      : getContinue(I.map2_(this.io, that.io, f));
  }
}

export class Effect<R, E, A> extends AbstractContinue {
  readonly _tag = "Effect";
  constructor(readonly query: XQuery<R, E, A>) {
    super();
  }
}

export function effectContinue<R, E, A>(query: XQuery<R, E, A>): Continue<R, E, A> {
  return new Effect(query);
}

export class Get<E, A> extends AbstractContinue {
  readonly _tag = "Get";
  constructor(readonly io: I.FIO<E, A>) {
    super();
  }
}

export function getContinue<E, A>(io: I.FIO<E, A>): Continue<unknown, E, A> {
  return new Get(io);
}

export type Continue<R, E, A> = Effect<R, E, A> | Get<E, A>;

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
          () => I.die("TODO: Query Failure"),
          (a) => I.fromEither(() => a)
        )
      )
    )
  );
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
    });
  }

  gives<R, E, A, R0>(this: Result<R, E, A>, f: Described<(r0: R0) => R>): Result<R0, E, A> {
    return matchTag_(this, {
      Blocked: ({ blockedRequests, cont }) =>
        blockedResult(BRS.gives_(blockedRequests, f), cont.gives(f)),
      Fail: ({ cause }) => failResult(cause),
      Done: ({ value }) => doneResult(value)
    });
  }
}

export class Blocked<R, E, A> extends AbstractResult {
  readonly _tag = "Blocked";
  constructor(readonly blockedRequests: BRS.BlockedRequests<R>, readonly cont: Continue<R, E, A>) {
    super();
  }
}

export class Done<A> extends AbstractResult {
  readonly _tag = "Done";
  constructor(readonly value: A) {
    super();
  }
}

export class Fail<E> extends AbstractResult {
  readonly _tag = "Fail";
  constructor(readonly cause: Ca.Cause<E>) {
    super();
  }
}

export type Result<R, E, A> = Blocked<R, E, A> | Done<A> | Fail<E>;

export function blockedResult<R, E, A>(
  blockedRequests: BRS.BlockedRequests<R>,
  cont: Continue<R, E, A>
): Result<R, E, A> {
  return new Blocked(blockedRequests, cont);
}

export function failResult<E>(cause: Ca.Cause<E>): Result<unknown, E, never> {
  return new Fail(cause);
}

export function doneResult<A>(value: A): Done<A> {
  return new Done(value);
}

export function resultFromEither<E, A>(either: E.Either<E, A>): Result<unknown, E, A> {
  return E.fold_(
    either,
    (e) => failResult(Ca.fail(e)),
    (a) => doneResult(a)
  );
}
