import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { DecodeErrors, ErrorInfo } from "../DecodeError";
import * as DE from "../DecodeError";
import * as E from "../Either";
import type { C } from "./model";

/**
 * @internal
 */
export const SE = DE.getSemigroup<ErrorInfo>();

/**
 * @internal
 */
function both_<A, B>(
  fa: E.Either<DecodeErrors, A>,
  fb: E.Either<DecodeErrors, B>
): E.Either<DecodeErrors, readonly [A, B]> {
  return E.isLeft(fa)
    ? E.isLeft(fb)
      ? E.left(SE.combine_(fa.left, fb.left))
      : fa
    : E.isLeft(fb)
    ? fb
    : E.right([fa.right, fb.right]);
}

/**
 * @internal
 */
function alt_<A>(
  me: E.Either<DecodeErrors, A>,
  that: () => E.Either<DecodeErrors, A>
): E.Either<DecodeErrors, A> {
  if (E.isRight(me)) {
    return me;
  }
  const ea = that();
  return E.isLeft(ea) ? E.left(SE.combine_(me.left, ea.left)) : ea;
}

/**
 * @internal
 */
export const M: P.MonadFail<[E.URI], C> &
  P.Applicative<[E.URI], C> &
  P.Alt<[E.URI], C> &
  P.Bifunctor<[E.URI], E.V> = HKT.instance({
  ...E.MonadFail,
  ...E.Bifunctor,
  unit: E.unit,
  both_,
  both: <B>(fb: E.Either<DecodeErrors, B>) => <A>(fa: E.Either<DecodeErrors, A>) => both_(fa, fb),
  alt_,
  alt: <A>(that: () => E.Either<DecodeErrors, A>) => (me: E.Either<DecodeErrors, A>) =>
    alt_(me, that)
});
