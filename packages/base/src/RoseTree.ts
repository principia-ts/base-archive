import type * as HKT from './HKT'
import type { Show } from './Show'

import * as A from './Array'
import { identity } from './Function'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

/**
 * `Tree` is an implementation of a multi-way rose tree
 */
export interface RoseTree<A> {
  readonly value: A
  readonly forest: Forest<A>
}

export type Forest<A> = ReadonlyArray<RoseTree<A>>

export const URI = 'Tree'

export type URI = typeof URI

export type V = HKT.Auto

declare module './HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: RoseTree<A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function make<A>(value: A, forest: Forest<A>): RoseTree<A> {
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
export function unfoldTree<A, B>(b: B, f: (b: B) => [A, Array<B>]): RoseTree<A> {
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
) => HKT.Kind<M, C, N, K, Q, W, X, I, S, R, E, RoseTree<A>>
export function unfoldTreeM<M>(
  M: P.Monad<HKT.UHKT<M>>
): <A, B>(b: B, f: (b: B) => HKT.HKT<M, readonly [A, ReadonlyArray<B>]>) => HKT.HKT<M, RoseTree<A>> {
  const unfoldForestMM = unfoldForestM(M)
  return (b, f) => M.bind_(f(b), ([a, bs]) => M.bind_(unfoldForestMM(bs, f), (ts) => M.pure({ value: a, forest: ts })))
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

export function pure<A>(a: A): RoseTree<A> {
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

export function cross_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<readonly [A, B]> {
  return {
    value: [fa.value, fb.value],
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => cross_(a, b))
  }
}

export function cross<B>(fb: RoseTree<B>): <A>(fa: RoseTree<A>) => RoseTree<readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<A, B, C>(fa: RoseTree<A>, fb: RoseTree<B>, f: (a: A, b: B) => C): RoseTree<C> {
  return {
    value: f(fa.value, fb.value),
    forest: A.comprehension([fa.forest, fb.forest], (a, b) => crossWith_(a, b, f))
  }
}

export function crossWith<A, B, C>(fb: RoseTree<B>, f: (a: A, b: B) => C): (fa: RoseTree<A>) => RoseTree<C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<A, B>(fab: RoseTree<(a: A) => B>, fa: RoseTree<A>): RoseTree<B> {
  return bind_(fab, (f) => map_(fa, (a) => f(a)))
}

export function ap<A>(fa: RoseTree<A>): <B>(fab: RoseTree<(a: A) => B>) => RoseTree<B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<B>(fb: RoseTree<B>): <A>(fa: RoseTree<A>) => RoseTree<A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<A, B>(fa: RoseTree<A>, fb: RoseTree<B>): RoseTree<B> {
  return crossWith_(fa, fb, (_, b) => b)
}

/*
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
 */

export function extend_<A, B>(wa: RoseTree<A>, f: (wa: RoseTree<A>) => B): RoseTree<B> {
  return {
    value: f(wa),
    forest: A.map_(wa.forest, (a) => extend_(a, f))
  }
}

export function extend<A, B>(f: (wa: RoseTree<A>) => B): (wa: RoseTree<A>) => RoseTree<B> {
  return (wa) => extend_(wa, f)
}

export const duplicate: <A>(wa: RoseTree<A>) => RoseTree<RoseTree<A>> = extend(identity)

export function extract<A>(wa: RoseTree<A>): A {
  return wa.value
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldl_<A, B>(fa: RoseTree<A>, b: B, f: (b: B, a: A) => B): B {
  let r: B  = f(b, fa.value)
  const len = fa.forest.length
  for (let i = 0; i < len; i++) {
    r = foldl_(fa.forest[i], r, f)
  }
  return r
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: RoseTree<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: RoseTree<A>, b: B, f: (a: A, b: B) => B): B {
  let r: B  = b
  const len = fa.forest.length
  for (let i = len - 1; i >= 0; i--) {
    r = foldr_(fa.forest[i], r, f)
  }
  return f(fa.value, r)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: RoseTree<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: RoseTree<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (acc, a) => M.combine_(acc, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: RoseTree<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: RoseTree<A>, f: (a: A) => B): RoseTree<B> {
  return {
    value: f(fa.value),
    forest: A.map_(fa.forest, (a) => map_(a, f))
  }
}

export function map<A, B>(f: (a: A) => B): (fa: RoseTree<A>) => RoseTree<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<A, B>(ma: RoseTree<A>, f: (a: A) => RoseTree<B>): RoseTree<B> {
  const { value, forest } = f(ma.value)
  const combine           = A.getMonoid<RoseTree<B>>().combine_
  return {
    value,
    forest: combine(
      forest,
      A.map_(ma.forest, (a) => bind_(a, f))
    )
  }
}

export function bind<A, B>(f: (a: A) => RoseTree<B>): (ma: RoseTree<A>) => RoseTree<B> {
  return (ma) => bind_(ma, f)
}

export const flatten: <A>(mma: RoseTree<RoseTree<A>>) => RoseTree<A> = bind(identity)

export function tap_<A, B>(ma: RoseTree<A>, f: (a: A) => RoseTree<B>): RoseTree<A> {
  return bind_(ma, (a) => map_(f(a), () => a))
}

export function tap<A, B>(f: (a: A) => RoseTree<B>): (ma: RoseTree<A>) => RoseTree<A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

const draw = <A>(S: Show<A>) => (indentation: string, forest: Forest<A>): string => {
  let r     = ''
  const len = forest.length
  let tree: RoseTree<A>
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

export function drawTree<A>(S: Show<A>): (tree: RoseTree<A>) => string {
  return (tree) => S.show(tree.value) + drawForest(S)(tree.forest)
}

export function getShow<A>(S: Show<A>): Show<RoseTree<A>> {
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
  const out       = <A, B>(ta: RoseTree<A>, f: (a: A) => HKT.HKT<typeof _.G, B>): HKT.HKT<typeof _.G, RoseTree<B>> =>
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

export function unit(): RoseTree<void> {
  return {
    value: undefined,
    forest: A.empty()
  }
}
