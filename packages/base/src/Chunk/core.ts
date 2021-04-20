/* eslint-disable functional/immutable-data */
import type { Byte, ByteArray } from '../Byte'
import type { Either } from '../Either'
import type { ChunkURI } from '../Modules'
import type * as HKT from '@principia/prelude/HKT'
import type { Predicate } from '@principia/prelude/Predicate'
import type { Refinement } from '@principia/prelude/Refinement'

import * as P from '@principia/prelude'
import { identity, unsafeCoerce } from '@principia/prelude/function'
import { tuple } from '@principia/prelude/tuple'

import * as A from '../Array/core'
import * as It from '../Iterable'
import * as O from '../Option'
import { AtomicNumber } from '../util/support/AtomicNumber'

type URI = [HKT.URI<ChunkURI>]

const BUFFER_SIZE = 64

export interface Chunk<A> {
  readonly _URI: 'Chunk'
  readonly _A: () => A
  readonly length: number
  [Symbol.iterator](): Iterator<A>
}

abstract class ChunkImplementation<A> implements Chunk<A>, Iterable<A> {
  readonly _URI!: 'Chunk'
  readonly _A!: () => A
  abstract readonly length: number
  abstract readonly depth: number
  abstract readonly left: Chunk<A>
  abstract readonly right: Chunk<A>
  abstract readonly binary: boolean
  abstract get(n: number): A
  abstract foreach<B>(f: (a: A) => B): void
  abstract toArray(n: number, dest: Array<A> | Uint8Array): void
  abstract arrayIterator(): Iterator<ArrayLike<A>>
  abstract reverseArrayIterator(): Iterator<ArrayLike<A>>
  abstract [Symbol.iterator](): Iterator<A>

  private arrayLikeCache: ArrayLike<unknown> | undefined
  arrayLike(): ArrayLike<A> {
    if (this.arrayLikeCache) {
      return this.arrayLikeCache as ArrayLike<A>
    }
    const arr = this.binary ? alloc(this.length) : new Array(this.length)
    this.toArray(0, arr)
    this.arrayLikeCache = arr
    return arr as ArrayLike<A>
  }

  private arrayCache: Array<unknown> | undefined
  array(): ReadonlyArray<A> {
    if (this.arrayCache) {
      return this.arrayCache as Array<A>
    }
    const arr = new Array(this.length)
    this.toArray(0, arr)
    this.arrayCache = arr
    return arr as Array<A>
  }

  concat(that: ChunkImplementation<A>): ChunkImplementation<A> {
    concrete<A>(this)
    concrete<A>(that)
    if (this._tag === 'Empty') {
      return that
    }
    if (that._tag === 'Empty') {
      return this
    }
    if (this._tag === 'AppendN') {
      const chunk = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return this.start.concat(chunk).concat(that)
    }
    if (that._tag === 'PrependN') {
      const chunk = fromArray(A.takeLast_(that.buffer as Array<A>, that.bufferUsed))
      return this.concat(chunk).concat(that)
    }
    const diff = that.depth - this.depth
    if (Math.abs(diff) <= 1) {
      return new Concat(this, that)
    } else if (diff < -1) {
      if (this.left.depth >= this.right.depth) {
        const nr = this.right.concat(that)
        return new Concat(this.left, nr)
      } else {
        concrete(this.right)
        const nrr = this.right.right.concat(that)
        if (nrr.depth === this.depth - 3) {
          const nr = new Concat(this.right.left, nrr)
          return new Concat(this.left, nr)
        } else {
          const nl = new Concat(this.left, this.right.left)
          return new Concat(nl, nrr)
        }
      }
    } else {
      if (that.right.depth >= that.left.depth) {
        const nl = this.concat(that.left)
        return new Concat(nl, that.right)
      } else {
        concrete(that.left)
        const nll = this.concat(that.left.left)
        if (nll.depth === that.depth - 3) {
          const nl = new Concat(nll, that.left.right)
          return new Concat(nl, that.right)
        } else {
          const nr = new Concat(that.left.right, that.right)
          return new Concat(nll, nr)
        }
      }
    }
  }
  take(n: number): ChunkImplementation<A> {
    if (n <= 0) {
      return _Empty
    } else if (n >= this.length) {
      return this
    } else {
      concrete<A>(this)
      switch (this._tag) {
        case 'Empty':
          return _Empty
        case 'Slice':
          return n >= this.l ? this : new Slice(this.chunk, this.offset, n)
        case 'Singleton':
          return this
        default:
          return new Slice(this, 0, n)
      }
    }
  }
  append<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[0]    = a
    return new AppendN(this, buffer, 1, new AtomicNumber(1), this.binary && binary)
  }
  prepend<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary            = this.binary && isByte(a)
    const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
    buffer[BUFFER_SIZE - 1] = a
    return new PrependN(this, buffer, 1, new AtomicNumber(1), this.binary && binary)
  }

  /**
   * Materializes a chunk into a chunk backed by an array. This method can
   * improve the performance of bulk operations.
   */
  materialize(): ChunkImplementation<A> {
    concrete(this)
    switch (this._tag) {
      case 'Empty':
        return this
      case 'Arr':
        return this
      default:
        return fromArray(this.arrayLike())
    }
  }
}

const alloc = typeof Buffer !== 'undefined' ? Buffer.alloc : (n: number) => new Uint8Array(n)

function isByte(u: unknown): boolean {
  return typeof u === 'number' && Number.isInteger(u) && u >= 0 && u <= 255
}

class ArrayIndexOutOfBoundsException extends Error {
  constructor(readonly index: number) {
    super()
  }
}

class Empty<A> extends ChunkImplementation<A> {
  readonly _tag = 'Empty'
  length        = 0
  depth         = 0
  left          = this
  right         = this
  binary        = false
  get(_: number): A {
    throw new ArrayIndexOutOfBoundsException(_)
  }
  foreach<B>(_: (a: never) => B): void {
    return
  }
  toArray(_: number, __: Array<A> | Uint8Array): void {
    return
  }
  [Symbol.iterator](): Iterator<A> {
    return {
      next: () => {
        return {
          value: null,
          done: true
        }
      }
    }
  }
  arrayIterator(): Iterator<Array<A>> {
    return {
      next: () => ({
        value: undefined,
        done: true
      })
    }
  }
  reverseArrayIterator(): Iterator<Array<A>> {
    return {
      next: () => ({
        value: undefined,
        done: true
      })
    }
  }
}
const _Empty = new Empty<any>()

class Concat<A> extends ChunkImplementation<A> {
  readonly _tag = 'Concat'
  length        = this.left.length + this.right.length
  depth         = 1 + Math.max(this.left.depth, this.right.depth)
  binary        = this.left.binary && this.right.binary
  constructor(readonly left: ChunkImplementation<A>, readonly right: ChunkImplementation<A>) {
    super()
  }
  get(n: number): A {
    return n < this.left.length ? this.left.get(n) : this.right.get(n - this.left.length)
  }
  foreach<B>(f: (a: A) => B): void {
    this.left.foreach(f)
    this.right.foreach(f)
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    this.left.toArray(n, dest)
    this.right.toArray(n + this.left.length, dest)
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    return It.concat_(It.iterable(this.left.arrayIterator), It.iterable(this.right.arrayIterator))[Symbol.iterator]()
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    return It.concat_(It.iterable(this.right.reverseArrayIterator), It.iterable(this.left.reverseArrayIterator))[
      Symbol.iterator
    ]()
  }
}

class AppendN<A> extends ChunkImplementation<A> {
  readonly _tag = 'AppendN'
  length        = this.start.length + this.bufferUsed
  depth         = 0
  left          = _Empty
  right         = _Empty
  constructor(
    readonly start: ChunkImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
  }
  append<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length && this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[this.bufferUsed] = a
        return new AppendN(this.start, this.buffer, this.bufferUsed + 1, this.chain, this.binary && binary)
      }
      this.buffer[this.bufferUsed] = a
      return new AppendN(this.start, this.buffer, this.bufferUsed + 1, this.chain, this.binary && binary)
    } else {
      const buffer = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[0]    = a
      const chunk  = fromArray(this.buffer as Array<A>).take(this.bufferUsed)
      return new AppendN(this.start.concat(chunk), buffer, 1, new AtomicNumber(1), this.binary && binary)
    }
  }
  get(n: number): A {
    if (n < this.start.length) {
      return this.start.get(n)
    } else {
      return this.buffer[n - this.start.length] as A
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    this.start.toArray(n, dest)
    copyArray(this.buffer as ArrayLike<A>, 0, dest, this.start.length + n, this.bufferUsed)
  }
  foreach<B>(f: (a: A) => B): void {
    this.start.foreach(f)
    for (let i = 0; i < this.bufferUsed; i++) {
      f(this.buffer[i] as A)
    }
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    const array = this.arrayLike()
    let done    = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    const array = this.arrayLike()
    let done    = true
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class PrependN<A> extends ChunkImplementation<A> {
  readonly _tag = 'PrependN'
  length        = this.end.length + this.bufferUsed
  depth         = 0
  left          = _Empty
  right         = _Empty
  constructor(
    readonly end: ChunkImplementation<A>,
    readonly buffer: Array<unknown> | Uint8Array,
    readonly bufferUsed: number,
    readonly chain: AtomicNumber,
    readonly binary: boolean
  ) {
    super()
  }
  prepend<A1>(a: A1): ChunkImplementation<A | A1> {
    const binary = this.binary && isByte(a)
    if (this.bufferUsed < this.buffer.length && this.chain.compareAndSet(this.bufferUsed, this.bufferUsed + 1)) {
      if (this.binary && !binary) {
        const buffer = new Array(BUFFER_SIZE)
        for (let i = 0; i < BUFFER_SIZE; i++) {
          buffer[i] = this.buffer[i]
        }
        buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
        return new PrependN(this.end, buffer, this.bufferUsed + 1, this.chain, this.binary && binary)
      }
      this.buffer[BUFFER_SIZE - this.bufferUsed - 1] = a
      return new PrependN(this.end, this.buffer, this.bufferUsed + 1, this.chain, this.binary && binary)
    } else {
      const buffer            = this.binary && binary ? alloc(BUFFER_SIZE) : new Array(BUFFER_SIZE)
      buffer[BUFFER_SIZE - 1] = a
      const chunk             = fromArray(
        'subarray' in this.buffer
          ? this.buffer.subarray(this.buffer.length - this.bufferUsed)
          : this.buffer.slice(this.buffer.length - this.bufferUsed)
      ) as ChunkImplementation<A>
      return new PrependN(chunk.concat(this.end), buffer, 1, new AtomicNumber(1), this.binary && binary)
    }
  }
  get(n: number): A {
    return n < this.bufferUsed
      ? (this.buffer[BUFFER_SIZE - this.bufferUsed + n] as A)
      : this.end.get(n - this.bufferUsed)
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    const length = Math.min(this.bufferUsed, Math.max(dest.length - n, 0))
    copyArray(this.buffer, BUFFER_SIZE - this.bufferUsed, dest, n, length)
    this.end.toArray(n + length, dest)
  }
  foreach<B>(f: (a: A) => B): void {
    for (let i = BUFFER_SIZE - this.bufferUsed - 1; i < BUFFER_SIZE; i++) {
      f(this.buffer[i] as A)
    }
    this.end.foreach(f)
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Singleton<A> extends ChunkImplementation<A> {
  readonly _tag = 'Singleton'
  length        = 1
  depth         = 0
  left          = _Empty
  right         = _Empty
  binary        = isByte(this.value)
  constructor(readonly value: A) {
    super()
  }
  get(n: number): A {
    if (n === 0) {
      return this.value
    }
    throw new ArrayIndexOutOfBoundsException(n)
  }
  foreach<B>(f: (a: A) => B): void {
    f(this.value)
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    // eslint-disable-next-line functional/immutable-data
    dest[n] = this.value
  }
  [Symbol.iterator](): Iterator<A> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.value,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: [this.value],
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: [this.value],
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Slice<A> extends ChunkImplementation<A> {
  readonly _tag = 'Slice'
  length        = this.l
  depth         = 0
  left          = _Empty
  right         = _Empty
  binary        = this.chunk.binary
  constructor(readonly chunk: ChunkImplementation<A>, readonly offset: number, readonly l: number) {
    super()
  }
  get(n: number): A {
    return this.chunk.get(this.offset + n)
  }
  foreach<B>(f: (a: A) => B): void {
    let i = 0
    while (i < this.length) {
      f(this.get(i))
      i++
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array) {
    let i = 0
    let j = n
    while (i < this.length) {
      dest[j] = this.get(i)
      i++
      j++
    }
  }
  [Symbol.iterator](): Iterator<A> {
    const arr = this.arrayLike()
    return arr[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this.arrayLike(),
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class Arr<A> extends ChunkImplementation<A> {
  readonly _tag = 'Arr'
  length        = this._array.length
  depth         = 0
  left          = _Empty
  right         = _Empty
  binary        = false
  constructor(readonly _array: ReadonlyArray<A>) {
    super()
  }
  get(n: number): A {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this._array[n]
  }
  foreach<B>(f: (a: A) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(this._array[i])
    }
  }
  toArray(n: number, dest: Array<A> | Uint8Array): void {
    copyArray(this._array, 0, dest, n, this.length)
  }
  [Symbol.iterator](): Iterator<A> {
    return this._array[Symbol.iterator]()
  }
  arrayIterator(): Iterator<ReadonlyArray<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ReadonlyArray<A>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

class BinArr extends ChunkImplementation<Byte> {
  readonly _tag = 'Arr'
  length        = this._array.length
  depth         = 0
  left          = _Empty
  right         = _Empty
  binary        = true
  constructor(readonly _array: ByteArray) {
    super()
  }
  get(n: number): Byte {
    if (n >= this.length || n < 0) {
      throw new ArrayIndexOutOfBoundsException(n)
    }
    return this._array[n]
  }
  foreach<B>(f: (a: Byte) => B): void {
    for (let i = 0; i < this.length; i++) {
      f(this._array[i])
    }
  }
  [Symbol.iterator](): Iterator<Byte> {
    return this._array[Symbol.iterator]()
  }
  toArray(n: number, dest: Array<Byte> | Uint8Array): void {
    copyArray(this._array, 0, dest, n, this.length)
  }
  arrayIterator(): Iterator<ArrayLike<Byte>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
  reverseArrayIterator(): Iterator<ArrayLike<Byte>> {
    let done = false
    return {
      next: () => {
        if (!done) {
          done = true
          return {
            value: this._array,
            done: false
          }
        } else {
          return {
            value: null,
            done: true
          }
        }
      }
    }
  }
}

export function concrete<A>(
  _: Chunk<A>
): asserts _ is Empty<A> | Singleton<A> | Concat<A> | AppendN<A> | PrependN<A> | Slice<A> | Arr<A> {
  //
}

function copyArray<A>(
  source: ArrayLike<A>,
  sourcePos: number,
  dest: Array<A> | Uint8Array,
  destPos: number,
  length: number
): void {
  const j = Math.min(source.length, sourcePos + length)
  for (let i = sourcePos; i < j; i++) {
    // eslint-disable-next-line functional/immutable-data
    dest[destPos + i - sourcePos] = source[i]
  }
}

function fromArray<A>(array: ArrayLike<A>): ChunkImplementation<A> {
  if (array.length === 0) {
    return _Empty
  } else {
    return 'buffer' in array ? (new BinArr(array) as any) : new Arr(Array.from(array))
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function make<A>(...as: ReadonlyArray<A>): Chunk<A> {
  return new Arr(as)
}

export function from<A>(as: Iterable<A>): Chunk<A> {
  return new Arr(A.from(as))
}

export function fromBuffer(bytes: Uint8Array): Chunk<Byte> {
  return new BinArr(bytes as any)
}

export function empty<B>(): Chunk<B> {
  return new Empty()
}

export function single<A>(a: A): Chunk<A> {
  return new Singleton(a)
}

export function range(start: number, end: number): Chunk<number> {
  return fromArray(A.range(start, end))
}

export class ChunkBuilder<A> {
  constructor(private chunk: Chunk<A>) {}
  append(a: A): ChunkBuilder<A> {
    this.chunk = append_(this.chunk, a)
    return this
  }
  result(): Chunk<A> {
    return this.chunk
  }
}

export function builder<A>(): ChunkBuilder<A> {
  return new ChunkBuilder(empty())
}

/*
 * -------------------------------------------
 * predicates
 * -------------------------------------------
 */

export function isEmpty<A>(chunk: Chunk<A>): boolean {
  concrete(chunk)
  return chunk.length === 0
}

export function isNonEmpty<A>(chunk: Chunk<A>): boolean {
  return !isEmpty(chunk)
}

/*
 * -------------------------------------------
 * destructors
 * -------------------------------------------
 */

export function toArray<A>(chunk: Chunk<A>): ReadonlyArray<A> {
  concrete(chunk)
  return chunk.array()
}

export function toArrayLike<A>(chunk: Chunk<A>): ArrayLike<A> {
  concrete(chunk)
  return chunk.arrayLike()
}

export function toBuffer(chunk: Chunk<Byte>): Uint8Array {
  return unsafeCoerce(toArrayLike(chunk))
}

export function head<A>(chunk: Chunk<A>): O.Option<A> {
  concrete(chunk)
  if (isEmpty(chunk)) {
    return O.None()
  }
  return O.Some(chunk.get(0))
}

export function last<A>(chunk: Chunk<A>): O.Option<A> {
  concrete(chunk)
  if (isEmpty(chunk)) {
    return O.None()
  }
  return O.Some(chunk.get(chunk.length - 1))
}

/*
 * -------------------------------------------
 * ops
 * -------------------------------------------
 */

export function append_<A, A1>(chunk: Chunk<A>, a1: A1): Chunk<A | A1> {
  concrete(chunk)
  return chunk.append(a1)
}

export function append<A>(a: A): (chunk: Chunk<A>) => Chunk<A> {
  return (chunk) => append_(chunk, a)
}

export function concat_<A>(xs: Chunk<A>, ys: Chunk<A>): Chunk<A> {
  concrete(xs)
  concrete(ys)
  return xs.concat(ys)
}

export function concat<A>(ys: Chunk<A>): (xs: Chunk<A>) => Chunk<A> {
  return (xs) => concat_(xs, ys)
}

export function foreach_<A, B>(chunk: Chunk<A>, f: (a: A) => B): void {
  concrete(chunk)
  chunk.foreach(f)
}

export function foreach<A, B>(f: (a: A) => B): (chunk: Chunk<A>) => void {
  return (chunk) => foreach_(chunk, f)
}

export function prepend_<A>(chunk: Chunk<A>, a: A): Chunk<A> {
  concrete(chunk)
  return chunk.prepend(a)
}

export function prepend<A>(a: A): (chunk: Chunk<A>) => Chunk<A> {
  return (chunk) => prepend_(chunk, a)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(chunk: Chunk<A>, f: (a: A) => B): Chunk<B> {
  concrete<A>(chunk)
  if (chunk._tag === 'Singleton') {
    return new Singleton(f(chunk.value))
  }
  const b        = builder<B>()
  const iterator = chunk.arrayIterator()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const as = result.value
    for (let i = 0; i < as.length; i++) {
      b.append(f(as[i]))
    }
  }
  return b.result()
}

export function map<A, B>(f: (a: A) => B): (chunk: Chunk<A>) => Chunk<B> {
  return (chunk) => map_(chunk, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<A, B>(ma: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  concrete(ma)
  const iterator = ma.arrayIterator()
  let result: IteratorResult<ArrayLike<A>>
  let out        = empty<B>()
  while (!(result = iterator.next()).done) {
    const arr    = result.value
    const length = arr.length
    for (let i = 0; i < length; i++) {
      const a = arr[i]
      out     = concat_(out, f(a))
    }
  }
  return out
}

export function bind<A, B>(f: (a: A) => Chunk<B>): (ma: Chunk<A>) => Chunk<B> {
  return (ma) => bind_(ma, f)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function crossWith_<A, B, C>(as: Chunk<A>, bs: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> {
  return bind_(as, (a) => map_(bs, (b) => f(a, b)))
}

export function crossWith<A, B, C>(bs: Chunk<B>, f: (a: A, b: B) => C): (as: Chunk<A>) => Chunk<C> {
  return (as) => crossWith_(as, bs, f)
}

export function cross_<A, B>(as: Chunk<A>, bs: Chunk<B>): Chunk<readonly [A, B]> {
  return crossWith_(as, bs, tuple)
}

export function cross<B>(bs: Chunk<B>): <A>(as: Chunk<A>) => Chunk<readonly [A, B]> {
  return (as) => cross_(as, bs)
}

export function ap_<A, B>(fab: Chunk<(a: A) => B>, fa: Chunk<A>): Chunk<B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<A>(fa: Chunk<A>): <B>(fab: Chunk<(a: A) => B>) => Chunk<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Zip
 * -------------------------------------------
 */

export function zipWith_<A, B, C>(as: Chunk<A>, bs: Chunk<B>, f: (a: A, b: B) => C): Chunk<C> {
  concrete(as)
  concrete(bs)
  const length = Math.min(as.length, bs.length)
  if (length === 0) {
    return empty()
  } else {
    const leftIterator                      = as.arrayIterator()
    const rightIterator                     = bs.arrayIterator()
    const out                               = builder<C>()
    let left: IteratorResult<ArrayLike<A>>  = null as any
    let right: IteratorResult<ArrayLike<B>> = null as any
    let leftLength                          = 0
    let rightLength                         = 0
    let i                                   = 0
    let j                                   = 0
    let k                                   = 0
    while (i < length) {
      if (j < leftLength && k < rightLength) {
        const a = left.value[j]
        const b = right.value[k]
        const c = f(a, b)
        out.append(c)
        i++
        j++
        k++
      } else if (j === leftLength && !(left = leftIterator.next()).done) {
        leftLength = left.value.length
        j          = 0
      } else if (k === rightLength && !(right = rightIterator.next()).done) {
        rightLength = right.value.length
        k           = 0
      }
    }
    return out.result()
  }
}

export function zipWith<A, B, C>(bs: Chunk<B>, f: (a: A, b: B) => C): (as: Chunk<A>) => Chunk<C> {
  return (as) => zipWith_(as, bs, f)
}

export function zip_<A, B>(as: Chunk<A>, bs: Chunk<B>): Chunk<readonly [A, B]> {
  return zipWith_(as, bs, tuple)
}

export function zip<B>(bs: Chunk<B>): <A>(as: Chunk<A>) => Chunk<readonly [A, B]> {
  return (as) => zip_(as, bs)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function filter_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A>
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const out      = builder<A>()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      const a = array[i]
      if (predicate(a)) {
        out.append(a)
      }
    }
  }
  return out.result()
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => Chunk<B>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => filter_(fa, predicate)
}

export function filterMap_<A, B>(fa: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const out      = builder<B>()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      const ob = f(array[i])
      if (ob._tag === 'Some') {
        out.append(ob.value)
      }
    }
  }
  return out.result()
}

export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => filterMap_(self, f)
}

export function partition_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): readonly [Chunk<A>, Chunk<B>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>]
export function partition_<A>(fa: Chunk<A>, predicate: Predicate<A>): readonly [Chunk<A>, Chunk<A>] {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const left     = builder<A>()
  const right    = builder<A>()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      const a = array[i]
      if (predicate(a)) {
        right.append(a)
      } else {
        left.append(a)
      }
    }
  }
  return [left.result(), right.result()]
}

export function partition<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<B>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>]
export function partition<A>(predicate: Predicate<A>): (fa: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (fa) => partition_(fa, predicate)
}

export function partitionMap_<A, B, C>(fa: Chunk<A>, f: (a: A) => Either<B, C>): readonly [Chunk<B>, Chunk<C>] {
  concrete(fa)
  const iterator = fa.arrayIterator()
  const left     = builder<B>()
  const right    = builder<C>()
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      const eab = f(array[i])
      switch (eab._tag) {
        case 'Left':
          left.append(eab.left)
          break
        case 'Right':
          right.append(eab.right)
          break
      }
    }
  }
  return [left.result(), right.result()]
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
  concrete(fa)
  const iterator = fa.arrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = 0; i < array.length; i++) {
      out = f(out, array[i])
    }
  }
  return out
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Chunk<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldr_<A, B>(fa: Chunk<A>, b: B, f: (a: A, b: B) => B): B {
  concrete(fa)
  const iterator = fa.reverseArrayIterator()
  let out        = b
  let result: IteratorResult<ArrayLike<A>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    for (let i = array.length - 1; i >= 0; i--) {
      out = f(array[i], out)
    }
  }
  return out
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Chunk<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <A>(fa: Chunk<A>, f: (a: A) => M) => M {
  return (fa, f) => foldl_(fa, M.nat, (b, a) => M.combine_(b, f(a)))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: Chunk<A>) => M {
  const foldMapM_ = foldMap_(M)
  return (f) => (fa) => foldMapM_(fa, f)
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

export function compact<A>(as: Chunk<O.Option<A>>): Chunk<A> {
  return filterMap_(as, identity)
}

export function separate<E, A>(as: Chunk<Either<E, A>>): readonly [Chunk<E>, Chunk<A>] {
  concrete(as)
  const left     = builder<E>()
  const right    = builder<A>()
  const iterator = as.arrayIterator()
  let result: IteratorResult<ArrayLike<Either<E, A>>>
  while (!(result = iterator.next()).done) {
    const array = result.value
    const len   = array.length
    for (let i = 0; i < len; i++) {
      const ea = array[i]
      switch (ea._tag) {
        case 'Left': {
          left.append(ea.left)
          break
        }
        case 'Right': {
          right.append(ea.right)
        }
      }
    }
  }
  return [left.result(), right.result()]
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<URI>()((_) => (G) => (ta, f) =>
  foldl_(ta, G.pure(empty()), (fbs, a) => G.crossWith_(fbs, f(a), append_))
)

export const traverse: P.TraverseFn<URI> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<URI> = (G) => {
  const traverseG_ = traverse_(G)
  return (ta) => traverseG_(ta, identity)
}

/*
 * -------------------------------------------
 * Unfoldable
 * -------------------------------------------
 */

export function unfold<A, B>(b: B, f: (b: B) => O.Option<readonly [A, B]>): Chunk<A> {
  const out = builder<A>()
  let bb    = b
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const mt = f(bb)
    switch (mt._tag) {
      case 'Some': {
        const [a, b] = mt.value
        out.append(a)
        bb = b
        break
      }
      case 'None': {
        break
      }
    }
  }
}

/*
 * -------------------------------------------
 * combinators
 * -------------------------------------------
 */

export function drop_<A>(as: Chunk<A>, n: number): Chunk<A> {
  concrete(as)
  const len = as.length
  if (len <= 0) {
    return as
  } else if (n >= len) {
    return empty()
  } else {
    switch (as._tag) {
      case 'Slice':
        return new Slice(as.chunk, as.offset + n, as.l - n)
      case 'Singleton':
        return n > 0 ? empty() : as
      case 'Empty':
        return empty()
      default:
        return new Slice(as, n, len - n)
    }
  }
}

export function drop(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => drop_(as, n)
}

export function dropWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  concrete(as)
  switch (as._tag) {
    case 'Arr': {
      const arr = as.arrayLike()
      let i     = 0
      while (i < arr.length && predicate(arr[i])) {
        i++
      }
      return drop_(as, i)
    }
    default: {
      const iterator = as.arrayIterator()
      let result: IteratorResult<ArrayLike<A>>
      let cont       = true
      let i          = 0
      while (cont && !(result = iterator.next()).done) {
        const array = result.value
        let j       = 0
        while (cont && j < array.length) {
          if (predicate(array[j])) {
            i++
            j++
          } else {
            cont = false
          }
        }
      }
      return drop_(as, i)
    }
  }
}

export function dropWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => dropWhile_(as, predicate)
}

export function splitAt_<A>(as: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>] {
  return [take_(as, n), drop_(as, n)]
}

export function splitAt(n: number): <A>(as: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (as) => splitAt_(as, n)
}

export function take_<A>(as: Chunk<A>, n: number): Chunk<A> {
  concrete(as)
  return as.take(n)
}

export function take(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => take_(as, n)
}

export function takeWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  concrete(as)
  switch (as._tag) {
    case 'Arr': {
      const arr = as.arrayLike()
      let i     = 0
      while (i < arr.length && predicate(arr[i])) {
        i++
      }
      return take_(as, i)
    }
    default: {
      const iterator = as.arrayIterator()
      let result: IteratorResult<ArrayLike<A>>
      let cont       = true
      let i          = 0
      while (cont && !(result = iterator.next()).done) {
        const array = result.value
        let j       = 0
        while (cont && j < array.length) {
          if (!predicate(array[j])) {
            cont = false
          } else {
            i++
            j++
          }
        }
      }
      return take_(as, i)
    }
  }
}

export function takeWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => takeWhile_(as, predicate)
}

export function unsafeGet_<A>(as: Chunk<A>, n: number): A {
  concrete(as)
  return as.get(n)
}

export function unsafeGet(n: number): <A>(as: Chunk<A>) => A {
  return (as) => unsafeGet_(as, n)
}

export function get_<A>(as: Chunk<A>, n: number): O.Option<A> {
  return O.tryCatch(() => unsafeGet_(as, n))
}

export function get(n: number): <A>(as: Chunk<A>) => O.Option<A> {
  return (as) => get_(as, n)
}

export function findFirst_<A>(as: Chunk<A>, f: (a: A) => boolean): O.Option<A> {
  concrete(as)
  const iterator = as.arrayIterator()
  let out        = O.None<A>()
  let result: IteratorResult<ArrayLike<A>>
  while (out._tag === 'None' && !(result = iterator.next()).done) {
    const array  = result.value
    const length = array.length
    for (let i = 0; out._tag === 'None' && i < length; i++) {
      const a = array[i]
      if (f(a)) {
        out = O.Some(a)
      }
    }
  }
  return out
}

export function findFirst<A>(f: (a: A) => boolean): (as: Chunk<A>) => O.Option<A> {
  return (as) => findFirst_(as, f)
}

export function reverse<A>(as: Chunk<A>): Iterable<A> {
  concrete(as)
  const arr = as.arrayLike()
  return It.iterable<A>(() => {
    let i = arr.length - 1
    return {
      next: () => {
        if (i >= 0 && i < arr.length) {
          const k = arr[i]
          i--
          return {
            value: k,
            done: false
          }
        } else {
          return {
            value: undefined,
            done: true
          }
        }
      }
    }
  })
}

export function chop_<A, B>(as: Chunk<A>, f: (as: Chunk<A>) => readonly [B, Chunk<A>]): Chunk<B> {
  const out        = builder<B>()
  let cs: Chunk<A> = as
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs)
    out.append(b)
    cs = c
  }
  return out.result()
}

export function chop<A, B>(f: (as: Chunk<A>) => readonly [B, Chunk<A>]): (as: Chunk<A>) => Chunk<B> {
  return (as) => chop_(as, f)
}

export function chunksOf_<A>(as: Chunk<A>, n: number): Chunk<Chunk<A>> {
  return chop_(as, splitAt(n))
}

export function chunksOf(n: number): <A>(as: Chunk<A>) => Chunk<Chunk<A>> {
  return chop(splitAt(n))
}
