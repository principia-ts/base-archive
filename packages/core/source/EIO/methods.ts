import type * as E from "../Either";
import { identity } from "../Function";
import * as F from "../XPure";
import { fail, succeed } from "./constructors";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Methods
 * -------------------------------------------
 */

export const pure: <E = never, A = never>(a: A) => EIO<E, A> = F.pure;

export const unit: <E = never>() => EIO<E, void> = F.unit;

export const map_: <E, A, B>(fa: EIO<E, A>, f: (a: A) => B) => EIO<E, B> = F.map_;

export const map: <A, B>(f: (a: A) => B) => <E>(fa: EIO<E, A>) => EIO<E, B> = F.map;

export const ap_ = <E, A, G, B>(fab: EIO<G, (a: A) => B>, fa: EIO<E, A>): EIO<E | G, B> =>
   F.map_(F.both_(fab, fa), ([f, a]) => f(a));

export const ap = <E, A>(fa: EIO<E, A>) => <G, B>(fab: EIO<G, (a: A) => B>): EIO<E | G, B> => ap_(fab, fa);

export const apFirst_ = <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>): EIO<E | G, A> => apFirst_(fa, fb);

export const apSecond_ = <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>): EIO<E | G, B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

export const apSecond = <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>): EIO<E | G, B> => apSecond_(fa, fb);

export const lift2 = <A, B, C, E, G>(f: (a: A) => (b: B) => C) => (fa: EIO<E, A>) => (fb: EIO<G, B>): EIO<E | G, C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a)(b)),
      fb
   );

export const chain_: <E, A, G, B>(ma: EIO<E, A>, f: (a: A) => EIO<G, B>) => EIO<E | G, B> = F.chain_;

export const chain: <A, G, B>(f: (a: A) => EIO<G, B>) => <E>(ma: EIO<E, A>) => EIO<E | G, B> = F.chain;

export const tap_: <E, A, G, B>(fa: EIO<E, A>, f: (a: A) => EIO<G, B>) => EIO<E | G, A> = F.tap_;

export const tap: <A, G, B>(f: (a: A) => EIO<G, B>) => <E>(fa: EIO<E, A>) => EIO<E | G, A> = F.tap;

export const bimap_: <E, A, B, C>(pab: EIO<E, A>, f: (e: E) => B, g: (a: A) => C) => EIO<B, C> = F.bimap_;

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => (pab: EIO<E, A>) => EIO<B, C> = F.bimap;

export const first_: <E, A, B>(pab: EIO<E, A>, f: (e: E) => B) => EIO<B, A> = F.first_;

export const first: <E, B>(f: (e: E) => B) => <A>(pab: EIO<E, A>) => EIO<B, A> = F.first;

export const flatten = <E, G, A>(mma: EIO<E, EIO<G, A>>): EIO<E | G, A> => chain_(mma, identity);

export const recover: <E, A>(fa: EIO<E, A>) => EIO<never, E.Either<E, A>> = F.recover;

export const absolve: <E, E1, A>(fa: EIO<E, E.Either<E1, A>>) => EIO<E | E1, A> = F.absolve;

export const mapBoth_: <E, A, G, B, C>(fa: EIO<E, A>, fb: EIO<G, B>, f: (a: A, b: B) => C) => EIO<E | G, C> =
   F.mapBoth_;

export const mapBoth: <A, G, B, C>(fb: EIO<G, B>, f: (a: A, b: B) => C) => <E>(fa: EIO<E, A>) => EIO<E | G, C> =
   F.mapBoth;

export const both_: <E, A, G, B>(fa: EIO<E, A>, fb: EIO<G, B>) => EIO<E | G, readonly [A, B]> = F.both_;

export const both: <G, B>(fb: EIO<G, B>) => <E, A>(fa: EIO<E, A>) => EIO<E | G, readonly [A, B]> = F.both;

export const swap = <E, A>(pab: EIO<E, A>): EIO<A, E> => F.foldM_(pab, succeed, fail);

export const alt_ = <E, A, G>(fa: EIO<E, A>, that: () => EIO<G, A>): EIO<E | G, A> => chain_(fa, that);

export const alt = <A, G>(that: () => EIO<G, A>) => <E>(fa: EIO<E, A>): EIO<E | G, A> => alt_(fa, that);
