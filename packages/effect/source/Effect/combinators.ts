import * as E from "@principia/core/Either";
import { identity, pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import * as C from "../Cause";
import { bindS, die, foldCauseM_, foldM_, halt, map, map_, of, pure } from "./core";
import type { Effect } from "./Effect";
import { FoldInstruction, PureInstruction } from "./Effect";

export const either = <R, E, A>(self: Effect<R, E, A>): Effect<R, never, E.Either<E, A>> =>
   foldM_(
      self,
      (e) => pure(E.left(e)),
      (a) => pure(E.right(a))
   );

export const catchAll_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   f: (e: E) => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => foldM_(ma, f, (x) => pure(x));

export const catchAll = <R, E, E2, A>(f: (e: E2) => Effect<R, E, A>) => <R2, A2>(ma: Effect<R2, E2, A2>) =>
   catchAll_(ma, f);

export const tryOrElse_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   new FoldInstruction(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess);

export const tryOrElse = <A, R1, E1, A1, R2, E2, A2>(
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R, E>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> => tryOrElse_(ma, that, onSuccess);

export const orElse_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);

export const orElse = <R1, E1, A1>(that: () => Effect<R1, E1, A1>) => <R, E, A>(
   ma: Effect<R, E, A>
): Effect<R & R1, E1, A | A1> => tryOrElse_(ma, that, pure);

export const orElseEither_ = <R, E, A, R1, E1, A1>(
   self: Effect<R, E, A>,
   that: Effect<R1, E1, A1>
): Effect<R & R1, E1, E.Either<A, A1>> =>
   tryOrElse_(
      self,
      () => map_(that, E.right),
      (a) => new PureInstruction(E.left(a))
   );

export const orElseEither = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(ma: Effect<R, E, A>) =>
   orElseEither_(ma, that);

export const orElseFail_ = <R, E, A, E1>(ma: Effect<R, E, A>, e: E1): Effect<R, E1, A> => orElse_(ma, () => fail(e));

export const orElseOption_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, Option<E>, A>,
   that: () => Effect<R1, Option<E1>, A1>
): Effect<R & R1, Option<E | E1>, A | A1> =>
   catchAll_(
      ma,
      O.fold(that, (e) => fail(O.some<E | E1>(e)))
   );

export const orElseOption = <R1, E1, A1>(that: () => Effect<R1, Option<E1>, A1>) => <R, E, A>(
   ma: Effect<R, Option<E>, A>
) => orElseOption_(ma, that);

export const orElseSucceed_ = <R, E, A, A1>(ma: Effect<R, E, A>, a: A1): Effect<R, E, A | A1> =>
   orElse_(ma, () => pure(a));

export const orElseSucceed = <A1>(a: A1) => <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a);

export const orDieWith_ = <R, E, A>(ma: Effect<R, E, A>, f: (e: E) => unknown): Effect<R, never, A> =>
   foldM_(ma, (e) => die(f(e)), pure);

export const orDieWith = <E>(f: (e: E) => unknown) => <R, A>(ma: Effect<R, E, A>): Effect<R, never, A> =>
   orDieWith_(ma, f);

export const orDie = <R, E, A>(ma: Effect<R, E, A>): Effect<R, never, A> => orDieWith_(ma, identity);

export const orDieKeep = <R, E, A>(ma: Effect<R, E, A>): Effect<R, unknown, A> =>
   foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);

export const summarized_ = <R, E, A, R1, E1, B, C>(
   self: Effect<R, E, A>,
   summary: Effect<R1, E1, B>,
   f: (start: B, end: B) => C
): Effect<R & R1, E | E1, [C, A]> =>
   pipe(
      of,
      bindS("start", () => summary),
      bindS("value", () => self),
      bindS("end", () => summary),
      map((s) => [f(s.start, s.end), s.value])
   );

export const summarized = <R1, E1, B, C>(summary: Effect<R1, E1, B>, f: (start: B, end: B) => C) => <R, E, A>(
   self: Effect<R, E, A>
): Effect<R & R1, E | E1, [C, A]> => summarized_(self, summary, f);
