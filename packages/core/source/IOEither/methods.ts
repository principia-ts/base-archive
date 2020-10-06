import * as E from "../Either";
import * as EitherT from "../EitherT";
import { identity, tuple } from "../Function";
import * as I from "../IO";
import type * as TC from "../typeclass-index";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";

/*
 * -------------------------------------------
 * IOEither Methods
 * -------------------------------------------
 */

const Monad = EitherT.Monad(I.Monad);

export const pure: TC.PureF<[URI], V> = Monad.pure;

export const unit: <E = never>() => IOEither<E, void> = () => I.pure(E.unit());

export const _map: <E, A, B>(fa: IOEither<E, A>, f: (a: A) => B) => IOEither<E, B> = Monad._map;

export const map: <A, B>(f: (a: A) => B) => <E>(fa: IOEither<E, A>) => IOEither<E, B> = Monad.map;

export const _ap: <E, A, G, B>(fab: IOEither<G, (a: A) => B>, fa: IOEither<E, A>) => IOEither<E | G, B> = Monad._ap;

export const ap: TC.ApF<[URI], V> = Monad.ap;

export const _apFirst = <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>): IOEither<E | G, A> =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst = <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>): IOEither<E | G, A> => _apFirst(fa, fb);

export const _apSecond = <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>): IOEither<E | G, B> =>
   _ap(
      _map(fa, () => (b) => b),
      fb
   );

export const apSecond = <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>): IOEither<E | G, B> =>
   _apSecond(fa, fb);

export const lift2 = <A, B, C, E, G>(f: (a: A) => (b: B) => C) => (fa: IOEither<E, A>) => (
   fb: IOEither<G, B>
): IOEither<E | G, C> =>
   _ap(
      _map(fa, (a) => (b) => f(a)(b)),
      fb
   );

export const _chain: <E, A, G, B>(ma: IOEither<E, A>, f: (a: A) => IOEither<G, B>) => IOEither<E | G, B> = Monad._chain;

export const chain: <A, G, B>(f: (a: A) => IOEither<G, B>) => <E>(ma: IOEither<E, A>) => IOEither<E | G, B> =
   Monad.chain;

export const _tap = <E, A, G, B>(fa: IOEither<E, A>, f: (a: A) => IOEither<G, B>): IOEither<E | G, A> =>
   _chain(fa, (a) => _map(f(a), () => a));

export const tap = <A, G, B>(f: (a: A) => IOEither<G, B>) => <E>(fa: IOEither<E, A>): IOEither<E | G, A> => _tap(fa, f);

export const _bimap = <E, A, B, C>(pab: IOEither<E, A>, f: (e: E) => B, g: (a: A) => C): IOEither<B, C> =>
   I._map(pab, E.bimap(f, g));

export const bimap = <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => (pab: IOEither<E, A>): IOEither<B, C> =>
   _bimap(pab, f, g);

export const _first = <E, A, B>(pab: IOEither<E, A>, f: (e: E) => B): IOEither<B, A> => I._map(pab, E.first(f));

export const first = <E, B>(f: (e: E) => B) => <A>(pab: IOEither<E, A>): IOEither<B, A> => _first(pab, f);

export const flatten = <E, G, A>(mma: IOEither<E, IOEither<G, A>>): IOEither<E | G, A> => _chain(mma, identity);

export const _mapBoth: <E, A, G, B, C>(
   fa: IOEither<E, A>,
   fb: IOEither<G, B>,
   f: (a: A, b: B) => C
) => IOEither<E | G, C> = Monad._mapBoth;

export const mapBoth: <A, G, B, C>(
   fb: IOEither<G, B>,
   f: (a: A, b: B) => C
) => <E>(fa: IOEither<E, A>) => IOEither<E | G, C> = Monad.mapBoth;

export const _both = <E, A, G, B>(fa: IOEither<E, A>, fb: IOEither<G, B>): IOEither<E | G, readonly [A, B]> =>
   _mapBoth(fa, fb, tuple);

export const both = <G, B>(fb: IOEither<G, B>) => <E, A>(fa: IOEither<E, A>): IOEither<E | G, readonly [A, B]> =>
   _both(fa, fb);

export const swap = <E, A>(pab: IOEither<E, A>): IOEither<A, E> => I._map(pab, E.swap);

export const _alt = <E, A, G>(fa: IOEither<E, A>, that: () => IOEither<G, A>): IOEither<E | G, A> =>
   I._chain(fa, E.fold(that, right));

export const alt = <A, G>(that: () => IOEither<G, A>) => <E>(fa: IOEither<E, A>): IOEither<E | G, A> => _alt(fa, that);
