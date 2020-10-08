/* eslint-disable @typescript-eslint/no-use-before-define */

import * as A from "@principia/core/Array";
import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import type { Predicate } from "@principia/core/Function";
import { constant, flow, identity, pipe } from "@principia/core/Function";
import type * as HKT from "@principia/core/HKT";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";
import type * as TC from "@principia/core/typeclass-index";

import type { At } from "./At";
import type { Iso } from "./Iso";
import type { Ix } from "./Ix";
import type { Lens } from "./Lens";
import type { Optional } from "./Optional";
import type { Prism } from "./Prism";
import type { Traversal } from "./Traversal";

export interface ModifyF<S, A> {
   <F extends HKT.URIS, C = HKT.Auto>(F: TC.Applicative<F, C>): <N extends string, K, Q, W, X, I, _S, R, E>(
      f: (a: A) => HKT.Kind<F, C, N, K, Q, W, X, I, _S, R, E, A>
   ) => (s: S) => HKT.Kind<F, C, N, K, Q, W, X, I, _S, R, E, S>;
}

export function implementModifyF<S, A>(): (
   i: <F>(_: {
      F: F;
      A: A;
      S: S;
   }) => (F: TC.Applicative<HKT.UHKT<F>>) => (f: (a: A) => HKT.HKT<F, A>) => (s: S) => HKT.HKT<F, S>
) => ModifyF<S, A>;
export function implementModifyF() {
   return (i: any) => i();
}

/*
 * -------------------------------------------
 * Internal Iso
 * -------------------------------------------
 */

/** @internal */
export const isoAsLens = <S, A>(sa: Iso<S, A>): Lens<S, A> => ({
   get: sa.get,
   set: flow(sa.reverseGet, constant)
});

/** @internal */
export const isoAsOptional = <S, A>(sa: Iso<S, A>): Optional<S, A> => ({
   getOption: flow(sa.get, O.some),
   set: flow(sa.reverseGet, constant)
});

/*
 * -------------------------------------------
 * Internal Lens
 * -------------------------------------------
 */
/** @internal */
export const lensAsOptional = <S, A>(sa: Lens<S, A>): Optional<S, A> => ({
   getOption: flow(sa.get, O.some),
   set: sa.set
});

/** @internal */
export const lensAsTraversal = <S, A>(sa: Lens<S, A>): Traversal<S, A> => ({
   modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) => F.map_(f(sa.get(s)), (a) => sa.set(a)(s)))
});

/** @internal */
export const lensComposeLens = <A, B>(ab: Lens<A, B>) => <S>(sa: Lens<S, A>): Lens<S, B> => ({
   get: (s) => ab.get(sa.get(s)),
   set: (b) => (s) => sa.set(ab.set(b)(sa.get(s)))(s)
});

/** @internal */
export const lensComposePrism = <A, B>(ab: Prism<A, B>) => <S>(sa: Lens<S, A>): Optional<S, B> =>
   optionalComposeOptional(prismAsOptional(ab))(lensAsOptional(sa));

/** @internal */
export const lensId = <S>(): Lens<S, S> => ({
   get: identity,
   set: constant
});

/** @internal */
export const lensProp = <A, P extends keyof A>(prop: P) => <S>(lens: Lens<S, A>): Lens<S, A[P]> => ({
   get: (s) => lens.get(s)[prop],
   set: (ap) => (s) => {
      const oa = lens.get(s);
      if (ap === oa[prop]) {
         return s;
      }
      return lens.set(Object.assign({}, oa, { [prop]: ap }))(s);
   }
});

/** @internal */
export const lensProps = <A, P extends keyof A>(...props: [P, P, ...Array<P>]) => <S>(
   lens: Lens<S, A>
): Lens<S, { [K in P]: A[K] }> => ({
   get: (s) => {
      const a = lens.get(s);
      const r: { [K in P]?: A[K] } = {};
      for (const k of props) {
         r[k] = a[k];
      }
      return r as any;
   },
   set: (a) => (s) => {
      const oa = lens.get(s);
      for (const k of props) {
         if (a[k] !== oa[k]) {
            return lens.set(Object.assign({}, oa, a))(s);
         }
      }
      return s;
   }
});

/** @internal */
export const lensComponent = <A extends ReadonlyArray<unknown>, P extends keyof A>(prop: P) => <S>(
   lens: Lens<S, A>
): Lens<S, A[P]> => ({
   get: (s) => lens.get(s)[prop],
   set: (ap) => (s) => {
      const oa = lens.get(s);
      if (ap === oa[prop]) {
         return s;
      }
      const copy: A = oa.slice() as any;
      copy[prop] = ap;
      return lens.set(copy)(s);
   }
});

/*
 * -------------------------------------------
 * Prism Internal
 * -------------------------------------------
 */

/** @internal */
export const prismAsOptional = <S, A>(sa: Prism<S, A>): Optional<S, A> => ({
   getOption: sa.getOption,
   set: (a) => prismSet(a)(sa)
});

/** @internal */
export const prismAsTraversal = <S, A>(sa: Prism<S, A>): Traversal<S, A> => ({
   modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      pipe(
         sa.getOption(s),
         O.fold(
            () => F.pure(s),
            (a) => F.map_(f(a), (a) => prismSet(a)(sa)(s))
         )
      )
   )
});

/** @internal */
export const prismModifyOption = <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S): Option<S> =>
   pipe(
      sa.getOption(s),
      O.map((o) => {
         const n = f(o);
         return n === o ? s : sa.reverseGet(n);
      })
   );

/** @internal */
export const prismModify = <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>): ((s: S) => S) => {
   const g = prismModifyOption(f)(sa);
   return (s) =>
      pipe(
         g(s),
         O.getOrElse(() => s)
      );
};

/** @internal */
export const prismSet = <A>(a: A): (<S>(sa: Prism<S, A>) => (s: S) => S) => prismModify(() => a);

/** @internal */
export const prismComposeLens = <A, B>(ab: Lens<A, B>) => <S>(sa: Prism<S, A>): Optional<S, B> =>
   optionalComposeOptional(lensAsOptional(ab))(prismAsOptional(sa));

/** @internal */
export const prismFromNullable = <A>(): Prism<A, NonNullable<A>> => ({
   getOption: O.fromNullable,
   reverseGet: identity
});

/** @internal */
export function prismFromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
   return {
      getOption: O.fromPredicate(predicate),
      reverseGet: identity
   };
}

/** @internal */
export const prismSome = <A>(): Prism<Option<A>, A> => ({
   getOption: identity,
   reverseGet: O.some
});

/** @internal */
export const prismRight = <E, A>(): Prism<Either<E, A>, A> => ({
   getOption: O.fromEither,
   reverseGet: E.right
});

/** @internal */
export const prismLeft = <E, A>(): Prism<E.Either<E, A>, E> => ({
   getOption: (s) => (E.isLeft(s) ? O.some(s.left) : O.none()), // TODO: replace with E.getLeft in v3
   reverseGet: E.left
});

/*
 * -------------------------------------------
 * Optional Internal
 * -------------------------------------------
 */

/** @internal */
export const optionalAsTraversal = <S, A>(sa: Optional<S, A>): Traversal<S, A> => ({
   modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      pipe(
         sa.getOption(s),
         O.fold(
            () => F.pure(s),
            (a) => F.map_(f(a), (a: A) => sa.set(a)(s))
         )
      )
   )
});

/** @internal */
export const optionalModifyOption = <A>(f: (a: A) => A) => <S>(optional: Optional<S, A>) => (s: S): Option<S> =>
   pipe(
      optional.getOption(s),
      O.map((a) => {
         const n = f(a);
         return n === a ? s : optional.set(n)(s);
      })
   );

/** @internal */
export const optionalModify = <A>(f: (a: A) => A) => <S>(optional: Optional<S, A>): ((s: S) => S) => {
   const g = optionalModifyOption(f)(optional);
   return (s) =>
      pipe(
         g(s),
         O.getOrElse(() => s)
      );
};

/** @internal */
export const optionalComposeOptional = <A, B>(ab: Optional<A, B>) => <S>(sa: Optional<S, A>): Optional<S, B> => ({
   getOption: flow(sa.getOption, O.chain(ab.getOption)),
   set: (b) => optionalModify(ab.set(b))(sa)
});

export const findFirst = <A>(predicate: Predicate<A>): Optional<ReadonlyArray<A>, A> => ({
   getOption: A.findl(predicate),
   set: (a) => (s) =>
      pipe(
         A.findlIndex(predicate)(s),
         O.fold(
            () => s,
            (i) => A.unsafeUpdateAt(i, a, s)
         )
      )
});

/*
 * -------------------------------------------
 * Traversal Internal
 * -------------------------------------------
 */

/** @internal */
export const traversalComposeTraversal = <A, B>(ab: Traversal<A, B>) => <S>(sa: Traversal<S, A>) => ({
   modifyF: implementModifyF<S, B>()((_) => (F) => (f) => sa.modifyF(F)(ab.modifyF(F)(f)))
});

/** @internal */
export function fromTraversable<T extends HKT.URIS, C = HKT.Auto>(
   T: TC.Traversable<T, C>
): <N extends string, K, Q, W, X, I, S, R, E, A>() => Traversal<HKT.Kind<T, C, N, K, Q, W, X, I, S, R, E, A>, A>;
export function fromTraversable<T>(T: TC.Traversable<HKT.UHKT<T>>) {
   return <A>(): Traversal<HKT.HKT<T, A>, A> => ({
      modifyF: implementModifyF<HKT.HKT<T, A>, A>()((_) => (F) => {
         const traverseF_ = T.traverse_(F);
         return (f) => (s) => traverseF_(s, f);
      })
   });
}

/*
 * -------------------------------------------
 * Ix Internal
 * -------------------------------------------
 */

/** @internal */
export const indexArray = <A = never>(): Ix<ReadonlyArray<A>, number, A> => ({
   index: (i) => ({
      getOption: (as) => A.lookup_(i, as),
      set: (a) => (as) =>
         pipe(
            A.updateAt(i, a)(as),
            O.getOrElse(() => as)
         )
   })
});

/** @internal */
export const indexRecord = <A = never>(): Ix<Readonly<Record<string, A>>, string, A> => ({
   index: (k) => ({
      getOption: (r) => R.lookup_(r, k),
      set: (a) => (r) => {
         if (r[k] === a || O.isNone(R.lookup_(r, k))) {
            return r;
         }
         return R.insertAt(k, a)(r);
      }
   })
});

/*
 * -------------------------------------------
 * At Internal
 * -------------------------------------------
 */

export const atRecord = <A = never>(): At<Readonly<Record<string, A>>, string, Option<A>> => ({
   at: (key) => ({
      get: (r) => R.lookup_(r, key),
      set: O.fold(
         () => R.deleteAt(key),
         (a) => R.insertAt(key, a)
      )
   })
});
