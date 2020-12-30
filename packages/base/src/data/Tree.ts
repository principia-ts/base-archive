import type * as HKT from '../HKT'
import type { Show } from './Show'

import * as P from '../typeclass'
import * as A from './Array'
import { identity } from './Function'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

/**
 * `Tree` is an implementation of a multi-way rose tree
 */
export interface Tree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

export type Forest<A> = ReadonlyArray<Tree<A>>

export const URI = 'Tree'

export type URI = typeof URI

export type V = HKT.Auto

declare module '../HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Tree<A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function make<A>(value: A, forest: Forest<A>): Tree<A> {
  return {
    value,
    forest
  }
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): Tree<A> {
  const [a, bs] = f(b)
  return { value: a, forest: unfoldForest(bs, f) }
}

/**
 * Build a tree from a seed value
 *
 * @category constructors
 * @since 1.0.0
 */
export function unfoldForest<A, B>(bs: Array<B>, f: (b: B) => [A, Array<B>]): Forest<A> {
  return bs.map((b) => unfoldTree(b, f))
}

export function unfoldTreeM<M extends HKT.URIS, C = HKT.Auto>(
  M: P.Monad<M, C>
): <N extends string, K, Q, W, X, I, S, R, E, A, B>(
  b: B,
  f: (b: B) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, Tree<A>>
export function unfoldTreeM<M>(
  M: P.Monad<HKT.UHKT<M>>
): <A, B>(b: B, f: (b: B) => HKT.HKT<M, readonly [A, ReadonlyArray<B>]>) => HKT.HKT<M, Tree<A>> {
  const unfoldForestMM = unfoldForestM(M)
  return (b, f) =>
    M.flatMap_(f(b), ([a, bs]) => M.flatMap_(unfoldForestMM(bs, f), (ts) => M.pure({ value: a, forest: ts })))
}

export function unfoldForestM<M extends HKT.URIS, C = HKT.Auto>(
  M: P.Monad<M, C>
): <N extends string, K, Q, W, X, I, S, R, E, A, B>(
  bs: ReadonlyArray<B>,
  f: (b: B) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, readonly [A, ReadonlyArray<B>]>
) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, Forest<A>>
export function unfoldForestM<M>(
  M: P.Monad<HKT.UHKT<M>>
): <A, B>(bs: ReadonlyArray<B>, f: (b: B) => HKT.HKT<M, readonly [A, ReadonlyArray<B>]>) => HKT.HKT<M, Forest<A>> {
  const traverseM = A.traverse_(M)
  return (bs, f) => traverseM(bs, (b) => unfoldTreeM(M)(b, f))
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): Tree<A> {
  return {
    value: a,
    forest: A.empty()
  }
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function product_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<readonly [A, B]> {
  return {
    value: [fa.value, fb.value],
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => product_(a, b))
  }
}

export function product<B>(fb: Tree<B>): <A>(fa: Tree<A>) => Tree<readonly [A, B]> {
  return (fa) => product_(fa, fb)
}

export function map2_<A, B, C>(fa: Tree<A>, fb: Tree<B>, f: (a: A, b: B) => C): Tree<C> {
  return {
    value: f(fa.value, fb.value),
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => map2_(a, b, f))
  }
}

export function map2<A, B, C>(fb: Tree<B>, f: (a: A, b: B) => C): (fa: Tree<A>) => Tree<C> {
  return (fa) => map2_(fa, fb, f)
}

export function ap_<A, B>(fab: Tree<(a: A) => B>, fa: Tree<A>): Tree<B> {
  return flatMap_(fab, (f) => map_(fa, (a) => f(a)))
}

export function ap<A>(fa: Tree<A>): <B>(fab: Tree<(a: A) => B>) => Tree<B> {
  return (fab) => ap_(fab, fa)
}

export function apFirst_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<A> {
  return map2_(fa, fb, (a, _) => a)
}

export function apFirst<B>(fb: Tree<B>): <A>(fa: Tree<A>) => Tree<A> {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<A, B>(fa: Tree<A>, fb: Tree<B>): Tree<B> {
  return map2_(fa, fb, (_, b) => b)
}

/*
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
 */

export function extend_<A, B>(wa: Tree<A>, f: (wa: Tree<A>) => B): Tree<B> {
  return {
    value: f(wa),
    forest: A.map_(wa.forest, (a) => extend_(a, f))
  }
}

export function extend<A, B>(f: (wa: Tree<A>) => B): (wa: Tree<A>) => Tree<B> {
  return (wa) => extend_(wa, f)
}

export const duplicate: <A>(wa: Tree<A>) => Tree<Tree<A>> = extend(identity)

export function extract<A>(wa: Tree<A>): A {
  return wa.value
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldLeft_<A, B>(fa: Tree<A>, b: B, f: (b: B, a: A) => B): B {
  let r: B = f(b, fa.value)
  const len = fa.forest.length
  for (let i = 0; i < len; i++) {
    r = foldLeft_(fa.forest[i], r, f)
  }
  return r
}

export function foldLeft<A, B>(b: B, f: (b: B, a: A) => B): (fa: Tree<A>) => B {
  return (fa) => foldLeft_(fa, b, f)
}

export function foldRight_<A, B>(fa: Tree<A>, b: B, f: (a: A, b: B) => B): B {
  let r: B  = b
  const len = fa.forest.length
  for (let i = len - 1; i >= 0; i--) {
    r = foldRight_(fa.forest[i], r, f)
  }
  return f(fa.value, r)
}

export function foldRight<A, B>(b: B, f: (a: A, b: B) => B): (fa: Tree<A>) => B {
  return (fa) => foldRight_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Tree<A>, f: (a: A) => M) => M {
  return (fa, f) => foldLeft_(fa, M.nat, (acc, a) => M.combine_(acc, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Tree<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: Tree<A>, f: (a: A) => B): Tree<B> {
  return {
    value: f(fa.value),
    forest: A.map_(fa.forest, (a) => map_(a, f))
  }
}

export function map<A, B>(f: (a: A) => B): (fa: Tree<A>) => Tree<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<B> {
  const { value, forest } = f(ma.value)
  const combine           = A.getMonoid<Tree<B>>().combine_
  return {
    value,
    forest: combine(
      forest,
      A.map_(ma.forest, (a) => flatMap_(a, f))
    )
  }
}

export function flatMap<A, B>(f: (a: A) => Tree<B>): (ma: Tree<A>) => Tree<B> {
  return (ma) => flatMap_(ma, f)
}

export const flatten: <A>(mma: Tree<Tree<A>>) => Tree<A> = flatMap(identity)

export function tap_<A, B>(ma: Tree<A>, f: (a: A) => Tree<B>): Tree<A> {
  return flatMap_(ma, (a) => map_(f(a), () => a))
}

export function tap<A, B>(f: (a: A) => Tree<B>): (ma: Tree<A>) => Tree<A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

const draw = <A>(S: Show<A>) => (indentation: string, forest: Forest<A>): string => {
  let r = ''
  const len = forest.length
  let tree: Tree<A>
  for (let i = 0; i < len; i++) {
    tree         = forest[i]
    const isLast = i === len - 1
    r           += indentation + (isLast ? '└' : '├') + '─ ' + S.show(tree.value)
    r           += draw(S)(indentation + (len > 1 && !isLast ? '│  ' : '   '), tree.forest)
  }
  return r
}

export function drawForest<A>(S: Show<A>): (forest: Forest<A>) => string {
  return (forest) => draw(S)('\n', forest)
}

export function drawTree<A>(S: Show<A>): (tree: Tree<A>) => string {
  return (tree) => S.show(tree.value) + drawForest(S)(tree.forest)
}

export function getShow<A>(S: Show<A>): Show<Tree<A>> {
  return {
    show: drawTree(S)
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (G) => {
  const traverseG = A.traverse_(G)
  const out = <A, B>(ta: Tree<A>, f: (a: A) => HKT.HKT<typeof _.G, B>): HKT.HKT<typeof _.G, Tree<B>> =>
    G.ap_(
      G.map_(f(ta.value), (value) => (forest: Forest<B>) => ({
        value,
        forest
      })),
      traverseG(ta.forest, (a) => out(a, f))
    )
  return out
})

export const traverse: P.TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f)

export const sequence: P.SequenceFn<[URI], V> = (G) => (ta) => traverse_(G)(ta, identity)

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Tree<void> {
  return {
    value: undefined,
    forest: A.empty()
  }
}
