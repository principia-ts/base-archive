import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as E from "../Either";
import * as EitherT from "../EitherT";
import { identity } from "../Function";
import * as I from "../IO";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";

/*
 * -------------------------------------------
 * IOEither Methods
 * -------------------------------------------
 */

const Monad = EitherT.Monad(I.Monad);
const Applicative = EitherT.Applicative(I.Applicative);

export const pure: P.PureFn<[URI], V> = P.pureF(Monad);

export const unit: <E = never>() => IOEither<E, void> = () => I.pure(E.unit());

export const map_: <E, A, B>(fa: IOEither<E, A>, f: (a: A) => B) => IOEither<E, B> = Monad.map_;

export const map: <A, B>(f: (a: A) => B) => <E>(fa: IOEither<E, A>) => IOEither<E, B> = Monad.map;

export const ap_: <E, A, G, B>(fab: IOEither<G, (a: A) => B>, fa: IOEither<E, A>) => IOEither<E | G, B> = P.apF_(
   Applicative
);

export const ap: P.ApFn<[URI], V> = (fa) => (fab) => ap_(fab, fa);

export const apFirst_ = <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>): IOEither<E | G, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>): IOEither<E | G, A> => apFirst_(fa, fb);

export const apSecond_ = <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>): IOEither<E | G, B> =>
   ap_(
      map_(fa, () => (b) => b),
      fb
   );

export const apSecond = <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>): IOEither<E | G, B> =>
   apSecond_(fa, fb);

export const lift2 = <A, B, C, E, G>(f: (a: A) => (b: B) => C) => (fa: IOEither<E, A>) => (
   fb: IOEither<G, B>
): IOEither<E | G, C> =>
   ap_(
      map_(fa, (a) => (b) => f(a)(b)),
      fb
   );

export const chain_: <E, A, G, B>(ma: IOEither<E, A>, f: (a: A) => IOEither<G, B>) => IOEither<E | G, B> = P.chainF_(
   Monad
);

export const chain: <A, G, B>(f: (a: A) => IOEither<G, B>) => <E>(ma: IOEither<E, A>) => IOEither<E | G, B> = P.chainF(
   Monad
);

export const tap_ = <E, A, G, B>(fa: IOEither<E, A>, f: (a: A) => IOEither<G, B>): IOEither<E | G, A> =>
   chain_(fa, (a) => map_(f(a), () => a));

export const tap = <A, G, B>(f: (a: A) => IOEither<G, B>) => <E>(fa: IOEither<E, A>): IOEither<E | G, A> => tap_(fa, f);

export const bimap_ = <E, A, B, C>(pab: IOEither<E, A>, f: (e: E) => B, g: (a: A) => C): IOEither<B, C> =>
   I.map_(pab, E.bimap(f, g));

export const bimap = <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => (pab: IOEither<E, A>): IOEither<B, C> =>
   bimap_(pab, f, g);

export const first_ = <E, A, B>(pab: IOEither<E, A>, f: (e: E) => B): IOEither<B, A> => I.map_(pab, E.first(f));

export const first = <E, B>(f: (e: E) => B) => <A>(pab: IOEither<E, A>): IOEither<B, A> => first_(pab, f);

export const flatten = <E, G, A>(mma: IOEither<E, IOEither<G, A>>): IOEither<E | G, A> => chain_(mma, identity);

export const mapBoth_: <E, A, G, B, C>(
   fa: IOEither<E, A>,
   fb: IOEither<G, B>,
   f: (a: A, b: B) => C
) => IOEither<E | G, C> = P.mapBothF_(Applicative);

export const mapBoth: <A, G, B, C>(
   fb: IOEither<G, B>,
   f: (a: A, b: B) => C
) => <E>(fa: IOEither<E, A>) => IOEither<E | G, C> = P.mapBothF(Applicative);

export const both_: <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>) => IOEither<E | G, readonly [A, B]> =
   Applicative.both_;

export const both: <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>) => IOEither<E | G, readonly [A, B]> =
   Applicative.both;

export const swap = <E, A>(pab: IOEither<E, A>): IOEither<A, E> => I.map_(pab, E.swap);

export const alt_ = <E, A, G>(fa: IOEither<E, A>, that: () => IOEither<G, A>): IOEither<E | G, A> =>
   I.chain_(fa, E.fold(that, right));

export const alt = <A, G>(that: () => IOEither<G, A>) => <E>(fa: IOEither<E, A>): IOEither<E | G, A> => alt_(fa, that);
