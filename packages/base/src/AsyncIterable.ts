import type { Either } from './Either'
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from './Function'
import type { Monoid } from './Monoid'
import type { Option } from './Option'

import { tuple } from './Function'

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function asyncIterable<A>(iterator: () => AsyncIterator<A>): AsyncIterable<A> {
  return {
    [Symbol.asyncIterator]() {
      return iterator()
    }
  }
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function zipWith_<A, B, C>(fa: AsyncIterable<A>, fb: AsyncIterable<B>, f: (a: A, b: B) => C): AsyncIterable<C> {
  return {
    [Symbol.asyncIterator]() {
      let done = false
      const ia = fa[Symbol.asyncIterator]()
      const ib = fb[Symbol.asyncIterator]()
      return {
        async next() {
          if (done) {
            return this.return!()
          }

          const [va, vb] = await Promise.all([ia.next(), ib.next()])
          return va.done || vb.done ? this.return!() : { done: false, value: f(va.value, vb.value) }
        },
        return(value?: unknown) {
          if (!done) {
            done = true
            if (typeof ia.return === 'function') {
              ia.return()
            }
            if (typeof ib.return === 'function') {
              ib.return()
            }
          }
          return Promise.resolve({ done: true, value })
        }
      }
    }
  }
}

export function zipWith<A, B, C>(
  fb: AsyncIterable<B>,
  f: (a: A, b: B) => C
): (fa: AsyncIterable<A>) => AsyncIterable<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function zip_<A, B>(fa: AsyncIterable<A>, fb: AsyncIterable<B>): AsyncIterable<readonly [A, B]> {
  return zipWith_(fa, fb, tuple)
}

export function zip<B>(fb: AsyncIterable<B>): <A>(fa: AsyncIterable<A>) => AsyncIterable<readonly [A, B]> {
  return (fa) => zip_(fa, fb)
}

export function ap_<A, B>(fab: AsyncIterable<(a: A) => B>, fa: AsyncIterable<A>): AsyncIterable<B> {
  return zipWith_(fab, fa, (f, a) => f(a))
}

export function ap<A>(fa: AsyncIterable<A>): <B>(fab: AsyncIterable<(a: A) => B>) => AsyncIterable<B> {
  return (fab) => ap_(fab, fa)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function ifilter_<A, B extends A>(
  fa: AsyncIterable<A>,
  refinement: RefinementWithIndex<number, A, B>
): AsyncIterable<B>
export function ifilter_<A>(fa: AsyncIterable<A>, predicate: PredicateWithIndex<number, A>): AsyncIterable<A>
export function ifilter_<A>(fa: AsyncIterable<A>, predicate: PredicateWithIndex<number, A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    let i    = -1
    const it = fa[Symbol.asyncIterator]()
    for (;;) {
      const result = await it.next()
      if (result.done) {
        break
      }
      i += 1
      if (predicate(i, result.value)) {
        yield result.value
      }
    }
  })
}

export function ifilter<A, B extends A>(
  refinement: RefinementWithIndex<number, A, B>
): (fa: AsyncIterable<A>) => AsyncIterable<B>
export function ifilter<A>(predicate: PredicateWithIndex<number, A>): (fa: AsyncIterable<A>) => AsyncIterable<A>
export function ifilter<A>(predicate: PredicateWithIndex<number, A>): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => ifilter_(fa, predicate)
}

export function filter_<A, B extends A>(fa: AsyncIterable<A>, refinement: Refinement<A, B>): AsyncIterable<B>
export function filter_<A>(fa: AsyncIterable<A>, predicate: Predicate<A>): AsyncIterable<A>
export function filter_<A>(fa: AsyncIterable<A>, predicate: Predicate<A>): AsyncIterable<A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: AsyncIterable<A>) => AsyncIterable<B>
export function filter<A>(predicate: Predicate<A>): (fa: AsyncIterable<A>) => AsyncIterable<A>
export function filter<A>(predicate: Predicate<A>): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => filter_(fa, predicate)
}

export function ifilterMap_<A, B>(fa: AsyncIterable<A>, f: (i: number, a: A) => Option<B>): AsyncIterable<B> {
  return asyncIterable(async function* () {
    let i = -1
    for await (const a of fa) {
      i       += 1
      const ob = f(i, a)
      if (ob._tag === 'Some') {
        yield ob.value
      }
    }
  })
}

export function ifilterMap<A, B>(f: (i: number, a: A) => Option<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => ifilterMap_(fa, f)
}

export function filterMap_<A, B>(fa: AsyncIterable<A>, f: (a: A) => Option<B>): AsyncIterable<B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

export function filterMap<A, B>(f: (a: A) => Option<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => filterMap_(fa, f)
}

export function ipartitionMap_<A, B, C>(
  fa: AsyncIterable<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return tuple(
    asyncIterable(async function* () {
      const mapped = imap_(fa, f)
      for await (const ea of mapped) {
        if (ea._tag === 'Left') {
          yield ea.left
        }
      }
    }),
    asyncIterable(async function* () {
      const mapped = imap_(fa, f)
      for await (const ea of mapped) {
        if (ea._tag === 'Right') {
          yield ea.right
        }
      }
    })
  )
}

export function ipartitionMap<A, B, C>(
  f: (i: number, a: A) => Either<B, C>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return (fa) => ipartitionMap_(fa, f)
}

export function partitionMap_<A, B, C>(
  fa: AsyncIterable<A>,
  f: (a: A) => Either<B, C>
): readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (fa: AsyncIterable<A>) => readonly [AsyncIterable<B>, AsyncIterable<C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function ifoldMap_<M>(M: Monoid<M>): <A>(fa: AsyncIterable<A>, f: (i: number, a: A) => M) => Promise<M> {
  return async (fa, f) => {
    let res = M.nat
    let n   = -1
    for await (const a of fa) {
      n  += 1
      res = M.combine_(res, f(n, a))
    }
    return res
  }
}

export function ifoldMap<M>(M: Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: AsyncIterable<A>) => Promise<M> {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: Monoid<M>): <A>(fa: AsyncIterable<A>, f: (a: A) => M) => Promise<M> {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: AsyncIterable<A>) => Promise<M> {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export async function ifoldl_<A, B>(fa: AsyncIterable<A>, b: B, f: (b: B, i: number, a: A) => B): Promise<B> {
  let res = b
  let n   = -1
  for await (const a of fa) {
    n  += 1
    res = f(res, n, a)
  }
  return res
}

export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: AsyncIterable<A>) => Promise<B> {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: AsyncIterable<A>, b: B, f: (b: B, a: A) => B): Promise<B> {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: AsyncIterable<A>) => Promise<B> {
  return (fa) => foldl_(fa, b, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

async function* asyncIterMap<A, B>(ia: AsyncIterable<A>, f: (i: number, a: A) => Promise<B>) {
  let n = -1
  for await (const a of ia) {
    n += 1
    yield await f(n, a)
  }
}

async function* syncIterMap<A, B>(ia: AsyncIterable<A>, f: (i: number, a: A) => B) {
  let n = -1
  for await (const a of ia) {
    n += 1
    yield f(n, a)
  }
}

export function imap_<A, B>(fa: AsyncIterable<A>, f: (i: number, a: A) => B): AsyncIterable<B> {
  return asyncIterable(() => syncIterMap(fa, f))
}

export function imap<A, B>(f: (i: number, a: A) => B): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => imap_(fa, f)
}

export function map_<A, B>(fa: AsyncIterable<A>, f: (a: A) => B): AsyncIterable<B> {
  return asyncIterable(() => syncIterMap(fa, (_, a) => f(a)))
}

export function map<A, B>(f: (a: A) => B): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => map_(fa, f)
}

export function imapPromise_<A, B>(fa: AsyncIterable<A>, f: (i: number, a: A) => Promise<B>): AsyncIterable<B> {
  return asyncIterable(() => asyncIterMap(fa, f))
}

export function imapPromise<A, B>(f: (i: number, a: A) => Promise<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => imapPromise_(fa, f)
}

export function mapPromise_<A, B>(fa: AsyncIterable<A>, f: (a: A) => Promise<B>): AsyncIterable<B> {
  return asyncIterable(() => asyncIterMap(fa, (_, a) => f(a)))
}

export function mapPromise<A, B>(f: (a: A) => Promise<B>): (fa: AsyncIterable<A>) => AsyncIterable<B> {
  return (fa) => mapPromise_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

async function* syncIterBind<A, B>(ia: AsyncIterable<A>, f: (a: A) => AsyncIterable<B>) {
  for await (const a of ia) {
    yield* f(a)
  }
}

export function bind_<A, B>(ma: AsyncIterable<A>, f: (a: A) => AsyncIterable<B>): AsyncIterable<B> {
  return asyncIterable(() => syncIterBind(ma, f))
}

export function bind<A, B>(f: (a: A) => AsyncIterable<B>): (ma: AsyncIterable<A>) => AsyncIterable<B> {
  return (ma) => bind_(ma, f)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function concat_<A>(fa: AsyncIterable<A>, fb: AsyncIterable<A>): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield* fa
    yield* fb
  })
}

export function concat<A>(fb: AsyncIterable<A>): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => concat_(fa, fb)
}

export function append_<A>(fa: AsyncIterable<A>, element: A): AsyncIterable<A> {
  return asyncIterable(async function* () {
    yield* fa
    yield element
  })
}

export function append<A>(element: A): (fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => append_(fa, element)
}

export function take_<A>(fa: AsyncIterable<A>, n: number): AsyncIterable<A> {
  return asyncIterable(async function* () {
    const ia = fa[Symbol.asyncIterator]()
    for (let i = 0; i < n; i++) {
      const el = await ia.next()
      if (el.done) {
        break
      }
      yield el.value
    }
  })
}

export function take(n: number): <A>(fa: AsyncIterable<A>) => AsyncIterable<A> {
  return (fa) => take_(fa, n)
}

export async function toArray<A>(fa: AsyncIterable<A>): Promise<ReadonlyArray<A>> {
  const as: A[] = []
  for await (const a of fa) {
    as.push(a)
  }
  return as
}
