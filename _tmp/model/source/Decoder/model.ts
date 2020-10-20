import * as E from "@principia/core/Either";
import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as DE from "../DecodeError";
import type * as FS from "../FreeSemigroup";

type DecodeError = FS.FreeSemigroup<DE.DecodeError<string>>;

type C = E.V & HKT.Fix<"E", DecodeError>;

const SE = DE.getSemigroup<string>();

/**
 * @internal
 */
export const both_ = <A, B>(
   fa: E.Either<DecodeError, A>,
   fb: E.Either<DecodeError, B>
): E.Either<DecodeError, readonly [A, B]> =>
   E.isLeft(fa)
      ? E.isLeft(fb)
         ? E.left(SE.combine_(fa.left, fb.left))
         : fa
      : E.isLeft(fb)
      ? fb
      : E.right([fa.right, fb.right]);

/**
 * @internal
 */
export const alt_ = <A>(
   me: E.Either<DecodeError, A>,
   that: () => E.Either<DecodeError, A>
): E.Either<DecodeError, A> => {
   if (E.isRight(me)) {
      return me;
   }
   const ea = that();
   return E.isLeft(ea) ? E.left(SE.combine_(me.left, ea.left)) : ea;
};

const M: P.MonadFail<[E.URI], C> &
   P.Applicative<[E.URI], C> &
   P.Alt<[E.URI], C> &
   P.Bifunctor<[E.URI], C> = HKT.instance({
   ...E.MonadFail,
   ...E.Bifunctor,
   unit: E.unit,
   both_,
   both: <B>(fb: E.Either<DecodeError, B>) => <A>(fa: E.Either<DecodeError, A>) => both_(fa, fb),
   alt_,
   alt: <A>(that: () => E.Either<DecodeError, A>) => (me: E.Either<DecodeError, A>) => alt_(me, that)
});
