/* eslint-disable @typescript-eslint/no-use-before-define */

import type { At } from './At'
import type { Iso } from './Iso'
import type { Ix } from './Ix'
import type { Lens } from './Lens'
import type { Optional } from './Optional'
import type { Prism } from './Prism'
import type { Traversal } from './Traversal'
import type { Either } from '@principia/base/Either'
import type { Predicate } from '@principia/base/Function'
import type * as HKT from '@principia/base/HKT'
import type { Option } from '@principia/base/Option'
import type * as P from '@principia/base/typeclass'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { constant, flow, identity, pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

export interface ModifyF<S, A> {
  <F extends HKT.URIS, C = HKT.Auto>(F: P.Applicative<F, C>): <N extends string, K, Q, W, X, I, _S, R, E>(
    f: (a: A) => HKT.Kind<F, C, N, K, Q, W, X, I, _S, R, E, A>
  ) => (s: S) => HKT.Kind<F, C, N, K, Q, W, X, I, _S, R, E, S>
}

export function implementModifyF<S, A>(): (
  i: <F>(_: {
    F: F
    A: A
    S: S
  }) => (F: P.Applicative<HKT.UHKT<F>>) => (f: (a: A) => HKT.HKT<F, A>) => (s: S) => HKT.HKT<F, S>
) => ModifyF<S, A>
export function implementModifyF() {
  return (i: any) => i()
}

/*
 * -------------------------------------------
 * Internal Iso
 * -------------------------------------------
 */

/** @internal */
export function isoAsLens<S, A>(sa: Iso<S, A>): Lens<S, A> {
  return {
    get: sa.get,
    set: flow(sa.reverseGet, constant)
  }
}

/** @internal */
export function isoAsOptional<S, A>(sa: Iso<S, A>): Optional<S, A> {
  return {
    getOption: flow(sa.get, O.Some),
    set: flow(sa.reverseGet, constant)
  }
}

/*
 * -------------------------------------------
 * Internal Lens
 * -------------------------------------------
 */
/** @internal */
export function lensAsOptional<S, A>(sa: Lens<S, A>): Optional<S, A> {
  return {
    getOption: flow(sa.get, O.Some),
    set: sa.set
  }
}

/** @internal */
export function lensAsTraversal<S, A>(sa: Lens<S, A>): Traversal<S, A> {
  return {
    modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) => F.map_(f(sa.get(s)), (a) => sa.set(a)(s)))
  }
}

/** @internal */
export function lensComposeLens<A, B>(ab: Lens<A, B>) {
  return <S>(sa: Lens<S, A>): Lens<S, B> => ({
    get: (s) => ab.get(sa.get(s)),
    set: (b) => (s) => sa.set(ab.set(b)(sa.get(s)))(s)
  })
}

/** @internal */
export function lensComposePrism<A, B>(ab: Prism<A, B>) {
  return <S>(sa: Lens<S, A>): Optional<S, B> => optionalComposeOptional(prismAsOptional(ab))(lensAsOptional(sa))
}

/** @internal */
export function lensId<S>(): Lens<S, S> {
  return {
    get: identity,
    set: constant
  }
}

/** @internal */
export function lensProp<A, P extends keyof A>(prop: P) {
  return <S>(lens: Lens<S, A>): Lens<S, A[P]> => ({
    get: (s) => lens.get(s)[prop],
    set: (ap) => (s) => {
      const oa = lens.get(s)
      if (ap === oa[prop]) {
        return s
      }
      return lens.set(Object.assign({}, oa, { [prop]: ap }))(s)
    }
  })
}

/** @internal */
export function lensProps<A, P extends keyof A>(...props: [P, P, ...Array<P>]) {
  return <S>(
    lens: Lens<S, A>
  ): Lens<
    S,
    {
      [K in P]: A[K]
    }
  > => ({
    get: (s) => {
      const a = lens.get(s)
      const r: {
        [K in P]?: A[K]
      } = {}
      for (const k of props) {
        // eslint-disable-next-line functional/immutable-data
        r[k] = a[k]
      }
      return r as any
    },
    set: (a) => (s) => {
      const oa = lens.get(s)
      for (const k of props) {
        if (a[k] !== oa[k]) {
          return lens.set(Object.assign({}, oa, a))(s)
        }
      }
      return s
    }
  })
}

/** @internal */
export function lensComponent<A extends ReadonlyArray<unknown>, P extends keyof A>(prop: P) {
  return <S>(lens: Lens<S, A>): Lens<S, A[P]> => ({
    get: (s) => lens.get(s)[prop],
    set: (ap) => (s) => {
      const oa = lens.get(s)
      if (ap === oa[prop]) {
        return s
      }
      const copy: A = oa.slice() as any
      // eslint-disable-next-line functional/immutable-data
      copy[prop] = ap
      return lens.set(copy)(s)
    }
  })
}

/*
 * -------------------------------------------
 * Prism Internal
 * -------------------------------------------
 */

/** @internal */
export function prismAsOptional<S, A>(sa: Prism<S, A>): Optional<S, A> {
  return {
    getOption: sa.getOption,
    set: (a) => prismSet(a)(sa)
  }
}

/** @internal */
export function prismAsTraversal<S, A>(sa: Prism<S, A>): Traversal<S, A> {
  return {
    modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      pipe(
        sa.getOption(s),
        O.match(
          () => F.pure(s),
          (a) => F.map_(f(a), (a) => prismSet(a)(sa)(s))
        )
      )
    )
  }
}

/** @internal */
export function prismModifyOption<A>(f: (a: A) => A) {
  return <S>(sa: Prism<S, A>) => (s: S): Option<S> =>
    pipe(
      sa.getOption(s),
      O.map((o) => {
        const n = f(o)
        return n === o ? s : sa.reverseGet(n)
      })
    )
}

/** @internal */
export function prismModify<A>(f: (a: A) => A) {
  return <S>(sa: Prism<S, A>): ((s: S) => S) => {
    const g = prismModifyOption(f)(sa)
    return (s) =>
      pipe(
        g(s),
        O.getOrElse(() => s)
      )
  }
}

/** @internal */
export function prismSet<A>(a: A): <S>(sa: Prism<S, A>) => (s: S) => S {
  return prismModify(() => a)
}

/** @internal */
export function prismComposeLens<A, B>(ab: Lens<A, B>) {
  return <S>(sa: Prism<S, A>): Optional<S, B> => optionalComposeOptional(lensAsOptional(ab))(prismAsOptional(sa))
}

/** @internal */
export function prismFromNullable<A>(): Prism<A, NonNullable<A>> {
  return {
    getOption: O.fromNullable,
    reverseGet: identity
  }
}

/** @internal */
export function prismFromPredicate<A>(predicate: Predicate<A>): Prism<A, A> {
  return {
    getOption: O.fromPredicate(predicate),
    reverseGet: identity
  }
}

/** @internal */
export function prismSome<A>(): Prism<Option<A>, A> {
  return {
    getOption: identity,
    reverseGet: O.Some
  }
}

/** @internal */
export function prismRight<E, A>(): Prism<Either<E, A>, A> {
  return {
    getOption: O.fromEither,
    reverseGet: E.Right
  }
}

/** @internal */
export function prismLeft<E, A>(): Prism<E.Either<E, A>, E> {
  return {
    getOption: (s) => (E.isLeft(s) ? O.Some(s.left) : O.None()),
    reverseGet: E.Left
  }
}

/*
 * -------------------------------------------
 * Optional Internal
 * -------------------------------------------
 */

/** @internal */
export function optionalAsTraversal<S, A>(sa: Optional<S, A>): Traversal<S, A> {
  return {
    modifyF: implementModifyF<S, A>()((_) => (F) => (f) => (s) =>
      pipe(
        sa.getOption(s),
        O.match(
          () => F.pure(s),
          (a) => F.map_(f(a), (a: A) => sa.set(a)(s))
        )
      )
    )
  }
}

/** @internal */
export function optionalModifyOption<A>(f: (a: A) => A) {
  return <S>(optional: Optional<S, A>) => (s: S): Option<S> =>
    pipe(
      optional.getOption(s),
      O.map((a) => {
        const n = f(a)
        return n === a ? s : optional.set(n)(s)
      })
    )
}

/** @internal */
export function optionalModify<A>(f: (a: A) => A) {
  return <S>(optional: Optional<S, A>): ((s: S) => S) => {
    const g = optionalModifyOption(f)(optional)
    return (s) =>
      pipe(
        g(s),
        O.getOrElse(() => s)
      )
  }
}

/** @internal */
export function optionalComposeOptional<A, B>(ab: Optional<A, B>) {
  return <S>(sa: Optional<S, A>): Optional<S, B> => ({
    getOption: flow(sa.getOption, O.bind(ab.getOption)),
    set: (b) => optionalModify(ab.set(b))(sa)
  })
}

export function findFirst<A>(predicate: Predicate<A>): Optional<ReadonlyArray<A>, A> {
  return {
    getOption: A.findFirst(predicate),
    set: (a) => (s) =>
      pipe(
        A.findFirstIndex(predicate)(s),
        O.match(
          () => s,
          (i) => A.unsafeUpdateAt_(s, i, a)
        )
      )
  }
}

/*
 * -------------------------------------------
 * Traversal Internal
 * -------------------------------------------
 */

/** @internal */
export function traversalComposeTraversal<A, B>(ab: Traversal<A, B>) {
  return <S>(sa: Traversal<S, A>): Traversal<S, B> => ({
    modifyF: implementModifyF<S, B>()((_) => (F) => (f) => sa.modifyF(F)(ab.modifyF(F)(f)))
  })
}

/** @internal */
export function fromTraversable<T extends HKT.URIS, C = HKT.Auto>(
  T: P.Traversable<T, C>
): <N extends string, K, Q, W, X, I, S, R, E, A>() => Traversal<HKT.Kind<T, C, N, K, Q, W, X, I, S, R, E, A>, A>
export function fromTraversable<T>(T: P.Traversable<HKT.UHKT<T>>) {
  return <A>(): Traversal<HKT.HKT<T, A>, A> => ({
    modifyF: implementModifyF<HKT.HKT<T, A>, A>()((_) => (F) => {
      const traverseF_ = T.traverse_(F)
      return (f) => (s) => traverseF_(s, f)
    })
  })
}

/*
 * -------------------------------------------
 * Ix Internal
 * -------------------------------------------
 */

/** @internal */
export function indexArray<A = never>(): Ix<ReadonlyArray<A>, number, A> {
  return {
    index: (i) => ({
      getOption: (as) => A.lookup_(as, i),
      set: (a) => (as) =>
        pipe(
          A.updateAt(i, a)(as),
          O.getOrElse(() => as)
        )
    })
  }
}

/** @internal */
export function indexRecord<A = never>(): Ix<Readonly<Record<string, A>>, string, A> {
  return {
    index: (k) => ({
      getOption: (r) => R.lookup_(r, k),
      set: (a) => (r) => {
        if (r[k] === a || O.isNone(R.lookup_(r, k))) {
          return r
        }
        return R.upsertAt_(r, k, a)
      }
    })
  }
}

/*
 * -------------------------------------------
 * At Internal
 * -------------------------------------------
 */

export function atRecord<A = never>(): At<Readonly<Record<string, A>>, string, Option<A>> {
  return {
    at: (key) => ({
      get: (r) => R.lookup_(r, key),
      set: O.match(
        () => R.deleteAt(key),
        (a) => R.upsertAt(key, a)
      )
    })
  }
}
