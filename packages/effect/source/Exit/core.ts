import * as A from "@principia/core/Array";
import { Either } from "@principia/core/Either";
import { identity, pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";
import { Maybe } from "@principia/core/Maybe";
import * as TC from "@principia/core/typeclass-index";

import * as C from "../Cause";
import { Cause } from "../Cause";
import type { FiberId } from "../Fiber/FiberId";
import { Exit, Failure, Success, URI, V } from "./Exit";

export type { Exit } from "./Exit";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const succeed = <A>(value: A): Exit<never, A> => ({
   _tag: "Success",
   value
});

export const failure = <E>(cause: Cause<E>): Exit<E, never> => ({
   _tag: "Failure",
   cause
});

export const fail = <E>(e: E): Exit<E, never> => failure(C.fail(e));

export const interrupt = (id: FiberId) => failure(C.interrupt(id));

export const die = (error: unknown): Exit<unknown, never> => failure(C.die(error));

export const unit: Exit<never, void> = succeed(undefined);

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export const _fold = <E, A, B>(
   exit: Exit<E, A>,
   onFailure: (e: Cause<E>) => B,
   onSuccess: (a: A) => B
): B => {
   switch (exit._tag) {
      case "Success": {
         return onSuccess(exit.value);
      }
      case "Failure": {
         return onFailure(exit.cause);
      }
   }
};

export const fold = <E, A, B>(onFailure: (e: Cause<E>) => B, onSuccess: (a: A) => B) => (
   exit: Exit<E, A>
): B => _fold(exit, onFailure, onSuccess);

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export const isSuccess = <E, A>(exit: Exit<E, A>): exit is Success<A> => exit._tag === "Success";

export const isFailure = <E, A>(exit: Exit<E, A>): exit is Failure<E> => exit._tag === "Failure";

export const isInterrupt = <E, A>(exit: Exit<E, A>): exit is Failure<E> =>
   isFailure(exit) ? C.isInterrupt(exit.cause) : false;

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

export const _map: TC.UC_MapF<[URI], V> = (fa, f) => (isFailure(fa) ? fa : succeed(f(fa.value)));

export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

export const _chain: TC.UC_ChainF<[URI], V> = (fa, f) => (isFailure(fa) ? fa : f(fa.value));

export const bind: TC.BindF<[URI], V> = (fa) => (f) => _chain(fa, f);

export const chain: TC.ChainF<[URI], V> = (f) => (fa) => _chain(fa, f);

export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) => _chain(fab, (f) => _map(fa, (a) => f(a)));

export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

export const pure: TC.PureF<[URI], V> = succeed;

export const _first: TC.UC_FirstF<[URI], V> = (pab, f) =>
   isFailure(pab) ? failure(C._map(pab.cause, f)) : pab;

export const first: TC.FirstF<[URI], V> = (f) => (pab) => _first(pab, f);

export const _bimap: TC.UC_BimapF<[URI], V> = (pab, f, g) =>
   isFailure(pab) ? _first(pab, f) : _map(pab, g);

export const bimap: TC.BimapF<[URI], V> = (f, g) => (pab) => _bimap(pab, f, g);

export const flatten: TC.FlattenF<[URI], V> = (mma) => _chain(mma, identity);

export const _tap: TC.UC_TapF<[URI], V> = (ma, f) =>
   _chain(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

export const tap: TC.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

export const chainFirst: TC.ChainFirstF<[URI], V> = tap;

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export const as = <B>(b: B): (<E>(fa: Exit<E, unknown>) => Exit<E, B>) => map(() => b);

export const _bothMapCause = <E, E1, A, B, C>(
   fa: Exit<E, A>,
   fb: Exit<E1, B>,
   f: (a: A, b: B) => C,
   g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
): Exit<E | E1, C> => {
   switch (fa._tag) {
      case "Failure": {
         switch (fb._tag) {
            case "Success": {
               return fa;
            }
            case "Failure": {
               return failure(g(fa.cause, fb.cause));
            }
         }
      }
      // eslint-disable-next-line no-fallthrough
      case "Success": {
         switch (fb._tag) {
            case "Success": {
               return succeed(f(fa.value, fb.value));
            }
            case "Failure": {
               return fb;
            }
         }
      }
   }
};

export const bothMapCause = <E, E1, A, B, C>(
   that: Exit<E1, B>,
   f: (a: A, b: B) => C,
   g: (e: C.Cause<E>, e1: C.Cause<E1>) => C.Cause<E | E1>
) => (exit: Exit<E, A>): Exit<E | E1, C> => _bothMapCause(exit, that, f, g);

export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) => _bothMapCause(fa, fb, f, C.then);

export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

export const collectAll = <E, A>(
   ...exits: ReadonlyArray<Exit<E, A>>
): Mb.Maybe<Exit<E, ReadonlyArray<A>>> =>
   pipe(
      A.head(exits),
      Mb.map((head) =>
         pipe(
            A._dropLeft(exits, 1),
            A.reduce(
               pipe(
                  head,
                  map((x): ReadonlyArray<A> => [x])
               ),
               (acc, el) =>
                  pipe(
                     acc,
                     bothMapCause(el, (acc, el) => [el, ...acc], C.then)
                  )
            ),
            map(A.reverse)
         )
      )
   );

export const collectAllPar = <E, A>(
   ...exits: ReadonlyArray<Exit<E, A>>
): Mb.Maybe<Exit<E, readonly A[]>> =>
   pipe(
      A.head(exits),
      Mb.map((head) =>
         pipe(
            A._dropLeft(exits, 1),
            A.reduce(
               pipe(
                  head,
                  map((x): ReadonlyArray<A> => [x])
               ),
               (acc, el) =>
                  pipe(
                     acc,
                     bothMapCause(el, (acc, el) => [el, ...acc], C.both)
                  )
            ),
            map(A.reverse)
         )
      )
   );

export const _orElseFail = <E, A, E1>(exit: Exit<E, A>, e: E1) => _first(exit, () => e);

export const orElseFail: <E1>(e: E1) => <E, A>(exit: Exit<E, A>) => Exit<E1, A> = (e) => (exit) =>
   _orElseFail(exit, e);

export const fromEither = <E, A>(e: Either<E, A>): Exit<E, A> =>
   e._tag === "Left" ? fail(e.left) : succeed(e.right);

export const fromMaybe = <E>(onNone: () => E) => <A>(a: Maybe<A>): Exit<E, A> =>
   a._tag === "Nothing" ? fail(onNone()) : succeed(a.value);

export const _both = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, [A, B]> =>
   _bothMapCause(fa, fb, (a, b) => [a, b], C.then);

export const both = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>) => _both(fa, fb);

export const _apFirst = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, A> =>
   _bothMapCause(fa, fb, (a, _) => a, C.then);

export const apFirst = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>): Exit<E | E1, A> =>
   _apFirst(fa, fb);

export const _bothPar = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, [A, B]> =>
   _bothMapCause(fa, fb, (a, b) => [a, b], C.both);

export const bothPar = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>): Exit<E | E1, [A, B]> =>
   _bothPar(fa, fb);

export const _apParFirst = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, A> =>
   _bothMapCause(fa, fb, (a, _) => a, C.both);

export const apParFirst = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>): Exit<E | E1, A> =>
   _apParFirst(fa, fb);

export const _apParSecond = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, B> =>
   _bothMapCause(fa, fb, (_, b) => b, C.both);

export const apParSecond = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>): Exit<E | E1, B> =>
   _apParSecond(fa, fb);

export const _apSecond = <E, E1, A, B>(fa: Exit<E, A>, fb: Exit<E1, B>): Exit<E | E1, B> =>
   _bothMapCause(fa, fb, (_, b) => b, C.then);

export const apSecond = <E1, B>(fb: Exit<E1, B>) => <E, A>(fa: Exit<E, A>): Exit<E | E1, B> =>
   _apSecond(fa, fb);
