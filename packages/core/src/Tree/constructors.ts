import type { Applicative, Monad } from "@principia/prelude";
import { chainF_, pureF } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as A from "../Array/_core";
import type { Forest, Tree } from "./model";

export function make<A>(value: A, forest: Forest<A>): Tree<A> {
   return {
      value,
      forest
   };
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): Tree<A> {
   const [a, bs] = f(b);
   return { value: a, forest: unfoldForest(bs, f) };
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldForest<A, B>(bs: Array<B>, f: (b: B) => [A, Array<B>]): Forest<A> {
   return bs.map((b) => unfoldTree(b, f));
}

export function unfoldTreeM<M extends HKT.URIS, C = HKT.Auto>(
   M: Applicative<M, C> & Monad<M, C>
): <N extends string, K, Q, W, X, I, S, R, E, A, B>(
   b: B,
   f: (b: B) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, Tree<A>>;
export function unfoldTreeM<M>(
   M: Applicative<HKT.UHKT<M>> & Monad<HKT.UHKT<M>>
): <A, B>(b: B, f: (b: B) => HKT.HKT<M, readonly [A, ReadonlyArray<B>]>) => HKT.HKT<M, Tree<A>> {
   const unfoldForestMM = unfoldForestM(M);
   const chain = chainF_(M);
   const pure = pureF(M);
   return (b, f) => chain(f(b), ([a, bs]) => chain(unfoldForestMM(bs, f), (ts) => pure({ value: a, forest: ts })));
}

export function unfoldForestM<M extends HKT.URIS, C = HKT.Auto>(
   M: Applicative<M, C> & Monad<M, C>
): <N extends string, K, Q, W, X, I, S, R, E, A, B>(
   bs: ReadonlyArray<B>,
   f: (b: B) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, Forest<A>>;
export function unfoldForestM<M>(
   M: Applicative<HKT.UHKT<M>> & Monad<HKT.UHKT<M>>
): <A, B>(bs: ReadonlyArray<B>, f: (b: B) => HKT.HKT<M, readonly [A, ReadonlyArray<B>]>) => HKT.HKT<M, Forest<A>> {
   const traverseM = A.traverse_(M);
   return (bs, f) => traverseM(bs, (b) => unfoldTreeM(M)(b, f));
}
