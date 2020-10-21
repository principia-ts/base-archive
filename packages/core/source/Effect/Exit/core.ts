import * as A from "../../Array";
import type { Either } from "../../Either";
import { identity, pipe, tuple } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { Cause } from "../Cause";
import * as C from "../Cause";
import type { FiberId } from "../Fiber/FiberId";
import type { Exit, Failure, Success } from "./Exit";

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const succeed = <E = never, A = never>(value: A): Exit<E, A> => ({
   _tag: "Success",
   value
});

export const failure = <E = never, A = never>(cause: Cause<E>): Exit<E, A> => ({
   _tag: "Failure",
   cause
});

export const fail = <E = never, A = never>(e: E): Exit<E, A> => failure(C.fail(e));

export const interrupt = (id: FiberId) => failure(C.interrupt(id));

export const die = (error: unknown): Exit<unknown, never> => failure(C.die(error));

export const unit: Exit<never, void> = succeed(undefined);

export const fromEither = <E, A>(e: Either<E, A>): Exit<E, A> => (e._tag === "Left" ? fail(e.left) : succeed(e.right));

export const fromOption_ = <E, A>(fa: Option<A>, onNone: () => E): Exit<E, A> =>
   fa._tag === "None" ? fail(onNone()) : succeed(fa.value);

export const fromOption = <E>(onNone: () => E) => <A>(fa: Option<A>): Exit<E, A> => fromOption_(fa, onNone);

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export const fold_ = <E, A, B>(exit: Exit<E, A>, onFailure: (e: Cause<E>) => B, onSuccess: (a: A) => B): B => {
   switch (exit._tag) {
      case "Success": {
         return onSuccess(exit.value);
      }
      case "Failure": {
         return onFailure(exit.cause);
      }
   }
};

export const fold = <E, A, B>(onFailure: (e: Cause<E>) => B, onSuccess: (a: A) => B) => (exit: Exit<E, A>): B =>
   fold_(exit, onFailure, onSuccess);

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

export const map_ = <E, A, B>(fa: Exit<E, A>, f: (a: A) => B): Exit<E, B> =>
   isFailure(fa) ? fa : succeed(f(fa.value));

export const map = <A, B>(f: (a: A) => B) => <E>(fa: Exit<E, A>): Exit<E, B> => map_(fa, f);

export const chain_ = <E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, B> =>
   isFailure(ma) ? ma : f(ma.value);

export const bind = <E, A>(fa: Exit<E, A>) => <G, B>(f: (a: A) => Exit<G, B>): Exit<E | G, B> => chain_(fa, f);

export const chain = <A, G, B>(f: (a: A) => Exit<G, B>) => <E>(fa: Exit<E, A>): Exit<E | G, B> => chain_(fa, f);

export const ap_ = <E, A, G, B>(fab: Exit<G, (a: A) => B>, fa: Exit<E, A>): Exit<E | G, B> =>
   chain_(fab, (f) => map_(fa, (a) => f(a)));

export const ap = <E, A>(fa: Exit<E, A>) => <G, B>(fab: Exit<G, (a: A) => B>): Exit<E | G, B> => ap_(fab, fa);

export const both_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> =>
   bothMapCause_(fa, fb, tuple, C.then);

export const both = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, readonly [A, B]> => both_(fa, fb);

export const apFirst_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> =>
   bothMapCause_(fa, fb, (a, _) => a, C.then);

export const apFirst = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, A> => apFirst_(fa, fb);

export const apSecond_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> =>
   bothMapCause_(fa, fb, (_, b) => b, C.then);

export const apSecond = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, B> => apSecond_(fa, fb);

export const pure: <A>(a: A) => Exit<never, A> = succeed;

export const first_ = <E, A, G>(pab: Exit<E, A>, f: (e: E) => G): Exit<G, A> =>
   isFailure(pab) ? failure(C.map_(pab.cause, f)) : pab;

export const first = <E, G>(f: (e: E) => G) => <A>(pab: Exit<E, A>): Exit<G, A> => first_(pab, f);

export const bimap_ = <E, A, G, B>(pab: Exit<E, A>, f: (e: E) => G, g: (a: A) => B): Exit<G, B> =>
   isFailure(pab) ? first_(pab, f) : map_(pab, g);

export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => (pab: Exit<E, A>): Exit<G, B> => bimap_(pab, f, g);

export const flatten = <E, G, A>(mma: Exit<E, Exit<G, A>>): Exit<E | G, A> => chain_(mma, identity);

export const tap_ = <E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, A> =>
   chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

export const tap = <A, G, B>(f: (a: A) => Exit<G, B>) => <E>(ma: Exit<E, A>): Exit<E | G, A> => tap_(ma, f);

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export const as_ = <E, A, B>(fa: Exit<E, A>, b: B): Exit<E, B> => map_(fa, () => b);

export const as = <B>(b: B): (<E, A>(fa: Exit<E, A>) => Exit<E, B>) => map(() => b);

export const bothMapCause_ = <E, A, G, B, C>(
   fa: Exit<E, A>,
   fb: Exit<G, B>,
   f: (a: A, b: B) => C,
   g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): Exit<E | G, C> => {
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

export const bothMapCause = <E, A, G, B, C>(
   fb: Exit<G, B>,
   f: (a: A, b: B) => C,
   g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
) => (fa: Exit<E, A>): Exit<E | G, C> => bothMapCause_(fa, fb, f, g);

export const mapBoth_ = <EA, A, EB, B, C>(fa: Exit<EA, A>, fb: Exit<EB, B>, f: (a: A, b: B) => C): Exit<EA | EB, C> =>
   bothMapCause_(fa, fb, f, C.then);

export const mapBoth = <A, G, B, C>(fb: Exit<G, B>, f: (a: A, b: B) => C) => <E>(fa: Exit<E, A>): Exit<E | G, C> =>
   mapBoth_(fa, fb, f);

export const collectAll = <E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, ReadonlyArray<A>>> =>
   pipe(
      A.head(exits),
      O.map((head) =>
         pipe(
            A.dropLeft_(exits, 1),
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

export const collectAllPar = <E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, readonly A[]>> =>
   pipe(
      A.head(exits),
      O.map((head) =>
         pipe(
            A.dropLeft_(exits, 1),
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

export const orElseFail_ = <E, A, G>(exit: Exit<E, A>, orElse: G) => first_(exit, () => orElse);

export const orElseFail = <G>(orElse: G) => <E, A>(exit: Exit<E, A>): Exit<G, A> => orElseFail_(exit, orElse);

export const bothPar_ = <E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> =>
   bothMapCause_(fa, fb, tuple, C.both);

export const bothPar = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, readonly [A, B]> =>
   bothPar_(fa, fb);

export const apParFirst_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> =>
   bothMapCause_(fa, fb, (a, _) => a, C.both);

export const apParFirst = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, A> => apParFirst_(fa, fb);

export const apParSecond_ = <E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> =>
   bothMapCause_(fa, fb, (_, b) => b, C.both);

export const apParSecond = <G, B>(fb: Exit<G, B>) => <E, A>(fa: Exit<E, A>): Exit<E | G, B> => apParSecond_(fa, fb);
