/*
 * -------------------------------------------
 * `Eval` is a port of the Eval monad from typelevel's `cats` library
 * -------------------------------------------
 */

import type * as P from './typeclass'
import type { Stack } from './util/support/Stack'

import * as D from './Derivation'
import { identity, tuple } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import { AtomicReference } from './util/support/AtomicReference'
import { makeStack } from './util/support/Stack'

/**
 * `Eval<A>` is a monad that controls evaluation, providing a way to perform
 * stack-safe recursion through an internal trampoline.
 *
 * NOTE: `Eval` is for pure computation _only_. Side-effects should not be
 * performed within `Eval`. If you must perform side-effects,
 * use `Sync`, `Async`, or `IO` from the `io` package
 */
export abstract class Eval<A> {
  readonly _U = URI
  readonly _A!: () => A

  abstract get value(): A
  abstract get memoize(): Eval<A>
}

export const URI = 'Eval'
export type URI = typeof URI

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Eval<A>
  }
}

class Now<A> extends Eval<A> {
  readonly _evalTag = 'Now'
  constructor(readonly a: A) {
    super()
  }
  get value() {
    return this.a
  }
  get memoize() {
    return this
  }
}

class Later<A> extends Eval<A> {
  readonly _evalTag        = 'Later'
  private thunk            = new AtomicReference<null | (() => A)>(null)
  private result: A | null = null
  constructor(f: () => A) {
    super()
    this.thunk.set(f)
  }
  get value() {
    if (!this.thunk.get) {
      return this.result!
    } else {
      const result = this.thunk.get()
      this.thunk.set(null)
      this.result = result
      return result
    }
  }
  get memoize() {
    return this
  }
}

class Always<A> extends Eval<A> {
  readonly _evalTag = 'Always'
  constructor(readonly thunk: () => A) {
    super()
  }
  get value() {
    return this.thunk()
  }
  get memoize() {
    return new Later(this.thunk)
  }
}

class Defer<A> extends Eval<A> {
  readonly _evalTag = 'Defer'
  constructor(readonly thunk: () => Eval<A>) {
    super()
  }
  get value() {
    return evaluate(this.thunk())
  }
  get memoize(): Eval<A> {
    return new Memoize(this)
  }
}

class Chain<A, B> extends Eval<B> {
  readonly _evalTag = 'Chain'
  constructor(readonly ma: Eval<A>, readonly f: (a: A) => Eval<B>) {
    super()
  }
  get value(): B {
    return evaluate(this)
  }
  get memoize(): Eval<B> {
    return new Memoize(this)
  }
}

class Memoize<A> extends Eval<A> {
  readonly _evalTag = 'Memoize'
  constructor(readonly ma: Eval<A>) {
    super()
  }
  public result: O.Option<A> = O.none<A>()

  get memoize() {
    return this
  }

  get value(): A {
    return O.getOrElse_(this.result, () => {
      const a = evaluate(this)
      // eslint-disable-next-line functional/immutable-data
      this.result = O.some(a)
      return a
    })
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Construct an eager Eval instance.
 *
 * In some sense it is equivalent to using a `const` in a typical computation.
 *
 * This type should be used when an A value is already in hand, or
 * when the computation to produce an A value is pure and very fast.
 */
export function now<A>(a: A): Eval<A> {
  return new Now(a)
}

/**
 * Construct a lazy Eval instance.
 *
 * This type should be used for most "lazy" values. In some sense it
 * is equivalent to using a thunked value, but is cached for speed
 * after the initial computation.
 *
 * When caching is not required or desired (e.g. if the value produced
 * may be large) prefer `always`. When there is no computation
 * necessary, prefer `now`.
 *
 * Once `later` has been evaluated, the closure (and any values captured
 * by the closure) will not be retained, and will be available for
 * garbage collection.
 */
export function later<A>(f: () => A): Eval<A> {
  return new Later(f)
}

/**
 * Construct a lazy Eval<A> instance.
 *
 * This type can be used for "lazy" values. In some sense it is
 * equivalent to using a thunked value.
 *
 * This type will evaluate the computation every time the value is
 * required. It should be avoided except when laziness is required and
 * caching must be avoided. Generally, prefer `later`.
 */
export function always<A>(thunk: () => A): Eval<A> {
  return new Always(thunk)
}

/**
 * Defer is a type of Eval that is used to defer computations
 * which produce Eval.
 */
export function defer<A>(thunk: () => Eval<A>): Eval<A> {
  return new Defer(thunk)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): Eval<A> {
  return now(a)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function map2_<A, B, C>(ma: Eval<A>, mb: Eval<B>, f: (a: A, b: B) => C): Eval<C> {
  return bind_(ma, (a) => map_(mb, (b) => f(a, b)))
}

export function map2<A, B, C>(mb: Eval<B>, f: (a: A, b: B) => C): (ma: Eval<A>) => Eval<C> {
  return (ma) => map2_(ma, mb, f)
}

export function product_<A, B>(ma: Eval<A>, mb: Eval<B>): Eval<readonly [A, B]> {
  return map2_(ma, mb, tuple)
}

export function product<B>(mb: Eval<B>): <A>(ma: Eval<A>) => Eval<readonly [A, B]> {
  return (ma) => product_(ma, mb)
}

export function ap_<A, B>(mab: Eval<(a: A) => B>, ma: Eval<A>): Eval<B> {
  return map2_(mab, ma, (f, a) => f(a))
}

export function ap<A>(ma: Eval<A>): <B>(mab: Eval<(a: A) => B>) => Eval<B> {
  return (mab) => ap_(mab, ma)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: Eval<A>, f: (a: A) => B): Eval<B> {
  return bind_(fa, (a) => now(f(a)))
}

export function map<A, B>(f: (a: A) => B): (fa: Eval<A>) => Eval<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<A, B>(ma: Eval<A>, f: (a: A) => Eval<B>): Eval<B> {
  return new Chain(ma, f)
}

export function bind<A, B>(f: (a: A) => Eval<B>): (ma: Eval<A>) => Eval<B> {
  return (ma) => bind_(ma, f)
}

export function flatten<A>(mma: Eval<Eval<A>>): Eval<A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Eval<void> {
  return now(undefined)
}

/*
 * -------------------------------------------
 * Runtime
 * -------------------------------------------
 */

type Concrete = Now<any> | Later<any> | Always<any> | Defer<any> | Chain<any, any> | Memoize<any>

export function evaluate<A>(e: Eval<A>): A {
  const addToMemo = <A1>(m: Memoize<A1>) => (a: A1): Eval<A1> => {
    // eslint-disable-next-line functional/immutable-data
    m.result = O.some(a)
    return new Now(a)
  }

  let frames  = undefined as Stack<(_: any) => Eval<any>> | undefined
  let current = e as Eval<any> | undefined
  let result  = null

  function popContinuation() {
    const current = frames?.value
    frames        = frames?.previous
    return current
  }

  function pushContinuation(cont: (_: any) => Eval<any>) {
    frames = makeStack(cont, frames)
  }

  while (current != null) {
    const I = current as Concrete
    switch (I._evalTag) {
      case 'Chain': {
        const nested       = I.ma as Concrete
        const continuation = I.f

        switch (nested._evalTag) {
          case 'Now': {
            current = continuation(nested.a)
            break
          }
          case 'Later': {
            current = continuation(nested.value())
            break
          }
          case 'Always': {
            current = continuation(nested.thunk())
            break
          }
          case 'Memoize': {
            if (nested.result._tag === 'Some') {
              current = I.f(nested.result.value)
              break
            } else {
              pushContinuation(continuation)
              pushContinuation(addToMemo(nested))
              current = nested.ma
              break
            }
          }
          default: {
            current = nested
            pushContinuation(continuation)
            break
          }
        }
        break
      }
      case 'Now': {
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(I.a)
        } else {
          current = undefined
          result  = I.a
        }
        break
      }
      case 'Later': {
        const a            = I.value()
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(a)
        } else {
          current = undefined
          result  = a
        }
        break
      }
      case 'Always': {
        const a            = I.thunk()
        const continuation = popContinuation()
        if (continuation) {
          current = continuation(a)
        } else {
          current = undefined
          result  = a
        }
        break
      }
      case 'Defer': {
        current = I.thunk()
        break
      }
      case 'Memoize': {
        if (I.result._tag === 'Some') {
          const f = popContinuation()
          if (f) {
            current = f(I.result.value)
            break
          } else {
            result  = I.result.value
            current = undefined
            break
          }
        } else {
          pushContinuation(addToMemo(I))
          current = I.ma
          break
        }
      }
    }
  }
  return result
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor = HKT.instance<P.Functor<[URI]>>({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[URI]>>({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
})

export const Applicative = HKT.instance<P.Applicative<[URI]>>({
  ...Apply,
  pure,
  unit
})

export const Monad = HKT.instance<P.Monad<[URI]>>({
  ...Applicative,
  bind_: bind_,
  bind: bind,
  flatten
})

export class GenEval<A> {
  readonly _A!: () => A
  constructor(readonly ma: Eval<A>) {}
  *[Symbol.iterator](): Generator<GenEval<A>, A, any> {
    return yield this
  }
}

function _run<T extends GenEval<any>, A>(
  state: IteratorYieldResult<T> | IteratorReturnResult<A>,
  iterator: Generator<T, A, any>
): Eval<A> {
  if (state.done) {
    return now(state.value)
  }
  return bind_(state.value.ma, (val) => {
    const next = iterator.next(val)
    return _run(next, iterator)
  })
}

export function gen<T extends GenEval<any>, A>(f: (i: <A>(_: Eval<A>) => GenEval<A>) => Generator<T, A, any>): Eval<A> {
  return defer(() => {
    const iterator = f((_) => new GenEval(_))
    const state    = iterator.next()
    return _run(state, iterator)
  })
}
