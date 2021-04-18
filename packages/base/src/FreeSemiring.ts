/*
 * Ported from https://github.com/zio/zio-prelude/blob/master/core/shared/src/main/scala/zio/prelude/ParSeq.scala
 */
import type { Eq } from './Eq'
import type * as HKT from './HKT'

import * as A from './Array'
import * as B from './boolean'
import * as E from './Either'
import { makeEq } from './Eq'
import * as Ev from './Eval'
import { flow, hole, identity, pipe } from './function'
import * as L from './List'
import { FreeSemiringURI } from './Modules'
import { tuple } from './tuple'
import * as P from './typeclass'
import { LinkedList, LinkedListNode } from './util/support/LinkedList'
import { Z } from './Z'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export { FreeSemiringURI }

export interface Single<A> {
  readonly _tag: 'Single'
  readonly value: A
}

export interface Then<Z, A> {
  readonly _tag: 'Then'
  readonly left: FreeSemiring<Z, A>
  readonly right: FreeSemiring<Z, A>
}

export interface Empty {
  readonly _tag: 'Empty'
}

export interface Both<Z, A> {
  readonly _tag: 'Both'
  readonly left: FreeSemiring<Z, A>
  readonly right: FreeSemiring<Z, A>
}

/**
 * `FreeSemiring` is an algebraic structure that generalizes fields of type `A`,
 * having an identity element `Empty`, an additive operation `Then`, and a multiplicative
 * operation `Both`.
 *
 * It can be used to represent some notion of "events" that can
 * take place in parallel or in sequence. For example, a `FreeSemiring`
 * parameterized on some error type could be used to model the potentially
 * multiple ways that an application can fail. On the other hand, a `FreeSemiring`
 * parameterized on some request type could be used to model a collection of
 * requests to external data sources, some of which could be executed in
 * parallel and some of which must be executed sequentially.
 *
 * The "emptiness" of the structure is parameterized on `Z`, making it more
 * simple to define folds specifically for non-empty structures. `void` represents
 * an empty structure, while `never` represents a non-empty structure
 */
export type FreeSemiring<Z, A> = Empty | Single<A> | Then<Z, A> | Both<Z, A>

export type V = HKT.V<'X', '+'>

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function single<A>(a: A): FreeSemiring<never, A> {
  return {
    _tag: 'Single',
    value: a
  }
}

export function empty<A>(): FreeSemiring<void, A> {
  return {
    _tag: 'Empty'
  }
}

export function then<Z, A>(left: FreeSemiring<Z, A>, right: FreeSemiring<Z, A>): FreeSemiring<Z, A> {
  return {
    _tag: 'Then',
    left,
    right
  }
}

export function both<Z, A, B>(left: FreeSemiring<Z, A>, right: FreeSemiring<Z, B>): FreeSemiring<Z, A | B> {
  return {
    _tag: 'Both',
    left,
    right
  }
}

/*
 * -------------------------------------------
 * Fold
 * -------------------------------------------
 */
function foldLoop<A, B>(
  onEmpty: B,
  onSingle: (a: A) => B,
  onThen: (l: B, r: B) => B,
  onBoth: (l: B, r: B) => B,
  input: LinkedList<FreeSemiring<any, A>>,
  output: LinkedList<E.Either<boolean, B>>
): LinkedList<B> {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  for (;;) {
    if (input.empty) {
      return output.foldl(new LinkedList(), (acc, val) => {
        if (val._tag === 'Right') {
          acc.prepend(val.right)
          return acc
        } else {
          if (val.left) {
            const left  = acc.unprepend()!
            const right = acc.unprepend()!
            acc.prepend(onBoth(left!, right!))
            return acc
          } else {
            const left  = acc.unprepend()!
            const right = acc.unprepend()!
            acc.prepend(onThen(left!, right!))
            return acc
          }
        }
      })
    } else {
      const head    = input.head!.value!
      const parSeqs = input.head!.next!
      /* eslint-disable no-param-reassign */
      switch (head._tag) {
        case 'Empty': {
          input = new LinkedList(parSeqs)
          output.prepend(E.Right(onEmpty))
          break
        }
        case 'Single': {
          input = new LinkedList(parSeqs)
          output.prepend(E.Right(onSingle(head.value)))
          break
        }
        case 'Then': {
          input = new LinkedList(parSeqs)
          input.prepend(head.right)
          input.prepend(head.left)
          output.prepend(E.Left(false))
          break
        }
        case 'Both': {
          input = new LinkedList(parSeqs)
          input.prepend(head.right)
          input.prepend(head.left)
          output.prepend(E.Left(true))
          break
        }
      }
      /* eslint-enable */
    }
  }
}

/**
 * Folds over the events in this collection of events using the specified
 * functions.
 */
export function fold_<Z, A, B>(
  fs: FreeSemiring<Z, A>,
  emptyCase: B,
  singleCase: (a: A) => B,
  thenCase: (l: B, r: B) => B,
  bothCase: (l: B, r: B) => B
): B {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return foldLoop(
    emptyCase,
    singleCase,
    thenCase,
    bothCase,
    new LinkedList<FreeSemiring<any, A>>(new LinkedListNode(fs)),
    new LinkedList()
  ).head!.value!
}

export function fold<A, B>(
  onEmpty: B,
  onSingle: (a: A) => B,
  onThen: (l: B, r: B) => B,
  onBoth: (l: B, r: B) => B
): <Z>(fs: FreeSemiring<Z, A>) => B {
  return (fs) => fold_(fs, onEmpty, onSingle, onThen, onBoth)
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function crossWith_<Z, A, Z1, B, C>(
  fa: FreeSemiring<Z, A>,
  fb: FreeSemiring<Z1, B>,
  f: (a: A, b: B) => C
): FreeSemiring<Z | Z1, C> {
  return bind_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, Z1, B, C>(
  fb: FreeSemiring<Z1, B>,
  f: (a: A, b: B) => C
): <Z>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<Z, A, Z1, B>(
  fa: FreeSemiring<Z, A>,
  fb: FreeSemiring<Z1, B>
): FreeSemiring<Z | Z1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<Z1, B>(
  fb: FreeSemiring<Z1, B>
): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function ap_<Z, A, Z1, B>(fab: FreeSemiring<Z, (a: A) => B>, fa: FreeSemiring<Z1, A>): FreeSemiring<Z | Z1, B> {
  return crossWith_(fab, fa, (f, a) => f(a))
}

export function ap<Z1, A>(
  fa: FreeSemiring<Z1, A>
): <Z, B>(fab: FreeSemiring<Z, (a: A) => B>) => FreeSemiring<Z | Z1, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<Z, A, Z1, B>(fa: FreeSemiring<Z, A>, fb: FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<Z1, B>(fb: FreeSemiring<Z1, B>): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<Z, A, Z1, B>(fa: FreeSemiring<Z, A>, fb: FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<Z1, B>(fb: FreeSemiring<Z1, B>): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, B> {
  return (fa) => apr_(fa, fb)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<Z, A, B>(fa: FreeSemiring<Z, A>, f: (a: A) => B): FreeSemiring<Z, B> {
  return bind_(fa, (a) => single(f(a)))
}

export function map<A, B>(f: (a: A) => B): <Z>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z, B> {
  return (fa) => map_(fa, f)
}

export function as_<Z, A, B>(fa: FreeSemiring<Z, A>, b: B): FreeSemiring<Z, B> {
  return map_(fa, () => b)
}

export function as<B>(b: B): <Z, A>(fa: FreeSemiring<Z, A>) => FreeSemiring<Z, B> {
  return (fa) => as_(fa, b)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<Z, A, Z1, B>(ma: FreeSemiring<Z, A>, f: (a: A) => FreeSemiring<Z1, B>): FreeSemiring<Z | Z1, B> {
  return fold_(ma, empty(), f, then, both)
}

export function bind<A, Z1, B>(
  f: (a: A) => FreeSemiring<Z1, B>
): <Z>(ma: FreeSemiring<Z, A>) => FreeSemiring<Z | Z1, B> {
  return (ma) => bind_(ma, f)
}

export function flatten<Z, Z1, A>(ma: FreeSemiring<Z, FreeSemiring<Z1, A>>): FreeSemiring<Z | Z1, A> {
  return bind_(ma, identity)
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<[HKT.URI<FreeSemiringURI>], V>()((_) => (G) => (ta, f) =>
  fold_(
    ta,
    G.pure(empty()),
    flow(f, G.map(single)),
    (gb1, gb2) => G.crossWith_(gb1, gb2, then),
    (gb1, gb2) => G.crossWith_(gb1, gb2, both)
  )
)

export const traverse = P.implementTraverse<[HKT.URI<FreeSemiringURI>], V>()((_) => (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
})

export const sequence = P.implementSequence<[HKT.URI<FreeSemiringURI>], V>()((_) => (G) => {
  const traverseG_ = traverse_(G)
  return (ta) => traverseG_(ta, identity)
})

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function first<A>(ma: FreeSemiring<never, A>): A {
  let current = ma
  for (;;) {
    switch (current._tag) {
      case 'Empty': {
        return hole<A>()
      }
      case 'Single': {
        return current.value
      }
      case 'Both': {
        current = current.left
        break
      }
      case 'Then': {
        current = current.left
        break
      }
    }
  }
}

/*
 * -------------------------------------------
 * instances
 * -------------------------------------------
 */

export function getEq<A>(E: Eq<A>): Eq<FreeSemiring<any, A>> {
  const equalsE = equals_(E)
  return makeEq((x, y) => equalsE(x, y).value)
}

/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

function equals_<A>(E: Eq<A>): (l: FreeSemiring<any, A>, r: FreeSemiring<any, A>) => Ev.Eval<boolean> {
  return (l, r) => {
    switch (l._tag) {
      case 'Empty': {
        if (r._tag !== 'Empty') {
          return Ev.pure(false)
        }
        return Ev.pure(true)
      }
      case 'Single': {
        if (r._tag !== 'Single') {
          return Ev.pure(false)
        }
        return Ev.pure(E.equals_(l.value, r.value))
      }
      case 'Both': {
        return pipe(
          Ev.sequenceT(
            equalBoth(E, l, r),
            symmetric(bothAssociate)(E, l, r),
            symmetric(bothDistribute)(E, l, r),
            bothCommute(E, l, r),
            symmetric(equalEmpty)(E, l, r)
          ),
          Ev.map(A.foldl(false, B.or_))
        )
      }
      case 'Then': {
        return pipe(
          Ev.sequenceT(
            equalThen(E, l, r),
            symmetric(thenAssociate)(E, l, r),
            symmetric(thenDistribute)(E, l, r),
            symmetric(equalEmpty)(E, l, r)
          ),
          Ev.map(A.foldl(false, B.or_))
        )
      }
    }
  }
}

function symmetric<X, A>(
  f: (E: Eq<A>, x: FreeSemiring<X, A>, y: FreeSemiring<X, A>) => Ev.Eval<boolean>
): (E: Eq<A>, x: FreeSemiring<X, A>, y: FreeSemiring<X, A>) => Ev.Eval<boolean> {
  return (E, x, y) => Ev.crossWith_(f(E, x, y), f(E, y, x), B.or_)
}

function bothAssociate<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Both' && l.left._tag === 'Both' && r._tag === 'Both' && r.right._tag === 'Both') {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function bothDistribute<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === 'Both' &&
    l.left._tag === 'Then' &&
    l.right._tag === 'Then' &&
    r._tag === 'Then' &&
    r.right._tag === 'Both'
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.left, l.right.left),
        equalsE(l.left.left, r.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === 'Both' &&
    l.left._tag === 'Then' &&
    l.right._tag === 'Then' &&
    r._tag === 'Then' &&
    r.left._tag === 'Both'
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(l.left.right, l.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.left.right, r.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function bothCommute<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Both' && r._tag === 'Both') {
    return Ev.crossWith_(equalsE(l.left, r.right), equalsE(l.right, r.left), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function thenAssociate<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Then' && l.left._tag === 'Then' && r._tag === 'Then' && r.right._tag === 'Then') {
    return Ev.map_(
      Ev.sequenceT(equalsE(l.left.left, r.left), equalsE(l.left.right, r.right.left), equalsE(l.right, r.right.right)),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function thenDistribute<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (
    l._tag === 'Then' &&
    l.right._tag === 'Both' &&
    r._tag === 'Both' &&
    r.right._tag === 'Then' &&
    r.left._tag === 'Then'
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.left, r.right.left),
        equalsE(l.left, r.left.left),
        equalsE(l.right.left, r.left.right),
        equalsE(l.right.right, r.right.right)
      ),
      A.foldl(true, B.and_)
    )
  } else if (
    l._tag === 'Then' &&
    l.left._tag === 'Both' &&
    r._tag === 'Both' &&
    r.left._tag === 'Then' &&
    r.right._tag === 'Then'
  ) {
    return Ev.map_(
      Ev.sequenceT(
        equalsE(r.left.right, r.right.right),
        equalsE(l.left.left, r.left.left),
        equalsE(l.left.right, r.right.left),
        equalsE(l.right, r.left.right)
      ),
      A.foldl(true, B.and_)
    )
  } else {
    return Ev.pure(false)
  }
}

function equalBoth<A>(E: Eq<A>, l: FreeSemiring<never, A>, r: FreeSemiring<never, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Both' && r._tag === 'Both') {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalThen<A>(E: Eq<A>, l: FreeSemiring<never, A>, r: FreeSemiring<never, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Then' && r._tag === 'Then') {
    return Ev.crossWith_(equalsE(l.left, r.left), equalsE(l.right, r.right), B.and_)
  } else {
    return Ev.pure(false)
  }
}

function equalEmpty<A>(E: Eq<A>, l: FreeSemiring<any, A>, r: FreeSemiring<any, A>): Ev.Eval<boolean> {
  const equalsE = equals_(E)
  if (l._tag === 'Then' || l._tag === 'Both') {
    if (l.left._tag === 'Empty') {
      return equalsE(l.right, r)
    } else if (l.right._tag === 'Empty') {
      return equalsE(l.left, r)
    } else {
      return Ev.pure(false)
    }
  } else {
    return Ev.pure(false)
  }
}
