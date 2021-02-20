import type { Byte } from '@principia/base/Byte'
import type { Either } from '@principia/base/Either'
import type { Predicate, Refinement } from '@principia/base/Function'
import type * as HKT from '@principia/base/HKT'
import type { Monoid } from '@principia/base/Monoid'

import * as A from '@principia/base/Array'
import { identity, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Chunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {}

export interface NonEmptyChunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {
  readonly 0: A
}

export type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Int8Array
  | Int16Array
  | Int32Array

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export function fromBuffer<A>(id: TypedArray): Chunk<A> {
  return id as any
}

export function empty<A>(): Chunk<A> {
  return []
}

export function single<A>(a: A): Chunk<A> {
  return [a]
}

export const range: (start: number, end: number) => Chunk<number> = A.range

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export function asBuffer(chunk: Chunk<Byte>): Buffer {
  if (Buffer && Buffer.isBuffer(chunk)) {
    return chunk
  }
  if (isTyped(chunk)) {
    return Buffer.from(chunk)
  }
  return Buffer.from(A.from<number>(chunk as any))
}

export function asArray<A>(chunk: Chunk<A>): ReadonlyArray<A> {
  if (Array.isArray(chunk)) {
    return chunk
  }
  return Array.from(chunk)
}

export function head<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.Some(as[0]) : O.None()
}

export function last<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.Some(as[as.length - 1]) : O.None()
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export function isTyped(chunk: Chunk<unknown>): chunk is TypedArray {
  return 'subarray' in chunk
}

export function isEmpty<A>(as: Chunk<A>): boolean {
  return as.length === 0
}

export function isNonEmpty<A>(as: Chunk<A>): as is NonEmptyChunk<A> {
  return as.length > 0
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function zipWith_<A, B, C>(fa: Chunk<A>, fb: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> {
  return Array.isArray(fa)
    ? Array.isArray(fb)
      ? A.zipWith_(fa, fb, f)
      : A.zipWith_(fa, A.from(fb), f)
    : Array.isArray(fb)
    ? A.zipWith_(A.from(fa), fb, f)
    : A.zipWith_(A.from(fa), A.from(fb), f)
}

export function zipWith<A, B, C>(fb: Chunk<B>, f: (a: A, b: B) => C): (fa: Chunk<A>) => Chunk<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zip_<A, B>(fa: Chunk<A>, fb: Chunk<B>): Chunk<readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

export function zip<B>(fb: Chunk<B>): <A>(fa: Chunk<A>) => Chunk<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function ap_<A, B>(fab: Chunk<(a: A) => B>, fa: Chunk<A>): Chunk<B> {
  return zipWith_(fab, fa, (f, a) => f(a))
}

export function ap<A>(fa: Chunk<A>): <B>(fab: Chunk<(a: A) => B>) => Chunk<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function filter_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  if (isTyped(fa)) {
    return fromBuffer(fa.filter(predicate as any))
  }
  if (Array.isArray(fa)) {
    return fa.filter(predicate)
  }
  return Array.from(fa).filter(predicate)
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => Chunk<B>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMap_<A, B>(fa: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  if (Array.isArray(fa)) {
    return A.filterMap_(fa, f)
  }
  return A.filterMap_(Array.from(fa), f)
}

export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => filterMap_(self, f)
}

export function partition_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): readonly [Chunk<A>, Chunk<B>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>] {
  if (Array.isArray(fa)) {
    return A.partition_(fa, predicate)
  }
  return A.partition_(A.from(fa), predicate)
}

export function partition<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<B>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(fa: Chunk<A>, f: (a: A) => Either<B, C>): readonly [Chunk<B>, Chunk<C>] {
  if (Array.isArray(fa)) {
    return A.partitionMap_(fa, f)
  }
  return A.partitionMap_(A.from(fa), f)
}

export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>): (fa: Chunk<A>) => readonly [Chunk<B>, Chunk<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldl_<A, B>(fa: Chunk<A>, b: B, f: (b: B, a: A) => B): B {
  if (Array.isArray(fa)) {
    return A.foldl_(fa, b, f)
  }
  let x = b
  for (const y of fa) {
    x = f(x, y)
  }
  return x
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Chunk<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: Chunk<A>, b: B, f: (a: A, b: B) => B): B {
  if (isEmpty(fa)) {
    return b
  }
  let x = b
  for (let i = fa.length; i > 0; i--) {
    x = f(fa[i], x)
  }
  return x
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Chunk<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: Monoid<M>): <A>(fa: Chunk<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: Chunk<A>) => M {
  const foldMapM_ = foldMap_(M)
  return (f) => (fa) => foldMapM_(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: Chunk<A>, f: (a: A) => B): Chunk<B> {
  if (Array.isArray(fa)) {
    return fa.map(f)
  }
  return Array.from(fa).map(f)
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: Chunk<A>) => map_(self, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<A, B>(ma: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  let rlen       = 0
  const l        = ma.length
  const mut_temp = new Array(l)
  for (let i = 0; i < l; i++) {
    const e     = ma[i]
    const arr   = f(e)
    rlen       += arr.length
    mut_temp[i] = arr
  }
  const mut_r = Array(rlen)
  let start   = 0
  for (let i = 0; i < l; i++) {
    const arr = mut_temp[i]
    const l   = arr.length
    for (let j = 0; j < l; j++) {
      mut_r[j + start] = arr[j]
    }
    start += l
  }
  return mut_r
}

export function bind<A, B>(f: (a: A) => Chunk<B>): (ma: Chunk<A>) => Chunk<B> {
  return (ma) => bind_(ma, f)
}

export function flatten<A>(mma: Chunk<Chunk<A>>): Chunk<A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function drop_<A>(as: Chunk<A>, n: number): Chunk<A> {
  if (isTyped(as)) {
    return fromBuffer(as.subarray(n, as.length))
  }
  if (Array.isArray(as)) {
    return A.drop_(as, n)
  }
  return A.drop_(Array.from(as), n)
}

export function drop(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => drop_(as, n)
}

export function splitAt_<A>(as: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>] {
  if (isTyped(as)) {
    return [fromBuffer(as.subarray(0, n)), fromBuffer(as.subarray(n))]
  }
  if (Array && Array.isArray(as)) {
    return [as.slice(0, n), as.slice(n)]
  }
  const as_ = Array.from(as)
  return [as_.slice(0, n), as_.slice(n)]
}

export function splitAt(n: number): <A>(as: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (as) => splitAt_(as, n)
}

export function concat_<A>(xs: Chunk<A>, ys: Chunk<A>): Chunk<A> {
  if (isEmpty(xs)) {
    return ys
  }

  if (isEmpty(ys)) {
    return xs
  }

  if (Buffer && Buffer.isBuffer(xs) && Buffer.isBuffer(ys)) {
    return fromBuffer(Buffer.concat([xs, ys]))
  }

  if (isTyped(xs) && xs.constructor === ys.constructor) {
    // @ts-expect-error
    const c = new xs.constructor(xs.length + ys.length)
    c.set(xs)
    c.set(ys, xs.length)
    return c
  }

  const lenx = xs.length
  if (lenx === 0) {
    return ys
  }
  const leny = ys.length
  if (leny === 0) {
    return xs
  }
  const mut_r = Array(lenx + leny)
  for (let i = 0; i < lenx; i++) {
    mut_r[i] = xs[i]
  }
  for (let i = 0; i < leny; i++) {
    mut_r[i + lenx] = ys[i]
  }
  return mut_r
}

export function concat<A>(ys: Chunk<A>): (xs: Chunk<A>) => Chunk<A> {
  return (xs) => concat_(xs, ys)
}

export const spanIndex_ = <A>(as: Chunk<A>, predicate: Predicate<A>): number => {
  const l = as.length
  let i   = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

export function spanIndex<A>(predicate: Predicate<A>): (as: Chunk<A>) => number {
  return (as) => spanIndex_(as, predicate)
}

export function dropWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  const i = spanIndex_(as, predicate)
  if (isTyped(as)) {
    return fromBuffer(as.slice(i, as.length))
  }
  const l        = as.length
  const mut_rest = Array(l - i)
  for (let j = i; j < l; j++) {
    mut_rest[j - i] = as[j]
  }
  return mut_rest
}

export function dropWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => dropWhile_(as, predicate)
}

export function collectWhileMap_<A, B>(as: Chunk<A>, f: (x: A) => O.Option<B>): Chunk<B> {
  const result: B[] = []

  for (let i = 0; i < as.length; i++) {
    const o = f(as[i])

    if (O.isSome(o)) {
      result.push(o.value)
    } else {
      break
    }
  }

  return result
}

export function collectWhileMap<A, B>(f: (a: A) => O.Option<B>): (as: Chunk<A>) => Chunk<B> {
  return (as) => collectWhileMap_(as, f)
}

export function takeWhile_<A, B extends A>(as: Chunk<A>, f: Refinement<A, B>): Chunk<B>
export function takeWhile_<A>(as: Chunk<A>, f: Predicate<A>): Chunk<A>
export function takeWhile_<A>(as: Chunk<A>, f: Predicate<A>): Chunk<A> {
  let j = as.length
  for (let i = 0; i < as.length; i++) {
    if (!f(as[i])) {
      j = i
      break
    }
  }

  if (isTyped(as)) {
    return fromBuffer(as.subarray(0, j))
  }
  if (Array && Array.isArray(as)) {
    return as.slice(0, j)
  }
  return Array.from(as).slice(0, j)
}

export function takeWhile<A, B extends A>(f: Refinement<A, B>): (as: Chunk<A>) => Chunk<B>
export function takeWhile<A>(f: Predicate<A>): (as: Chunk<A>) => Chunk<A>
export function takeWhile<A>(f: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => takeWhile_(as, f)
}

export function take_<A>(as: Chunk<A>, n: number): Chunk<A> {
  if (Buffer && Buffer.isBuffer(as)) {
    return fromBuffer(as.subarray(0, n))
  }
  if (Array.isArray(as)) {
    return as.slice(0, n)
  }
  return Array.from(as).slice(0, n)
}

export function take(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => take_(as, n)
}

export function append_<A>(as: Chunk<A>, a: A): Chunk<A> {
  if (Buffer && Buffer.isBuffer(as)) {
    const mut_b = Buffer.alloc(as.length + 1)
    as.copy(mut_b, 0, 0, as.length)
    mut_b[as.length] = a as any
    return fromBuffer(mut_b)
  }
  if (Array.isArray(as)) {
    return A.append_(as, a)
  }
  return A.append_(A.from(as), a)
}

export function append<A>(a: A): (as: Chunk<A>) => Chunk<A> {
  return (as) => append_(as, a)
}

export function grouped_<A>(as: Chunk<A>, n: number): Chunk<Chunk<A>> {
  return A.grouped_(A.from(as), n)
}

export function grouped(n: number): <A>(as: Chunk<A>) => Chunk<Chunk<A>> {
  return (as) => grouped_(as, n)
}
