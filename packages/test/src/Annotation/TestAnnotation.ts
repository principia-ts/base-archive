import type { Either } from '@principia/base/Either'
import type { Tag } from '@principia/base/Has'
import type { Hash } from '@principia/base/Hash'
import type { Chunk } from '@principia/io/Chunk'
import type * as Fiber from '@principia/io/Fiber'
import type { URef } from '@principia/io/IORef'

import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { makeEq } from '@principia/base/Eq'
import { absurd } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import { hash, hashString } from '@principia/base/Hash'
import * as Map from '@principia/base/HashMap'
import * as Set from '@principia/base/HashSet'
import * as C from '@principia/io/Chunk'

export const TestAnnotationHash: Hash<TestAnnotation<any>> & Eq.Eq<TestAnnotation<any>> = {
  ...makeEq(equalsTestAnnotation),
  hash
}

export class TestAnnotation<V> {
  constructor(
    readonly tag: Tag<V>,
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (v1: V, v2: V) => V
  ) {}

  readonly hashCode = Symbol.for([this.identifier, this.tag].toString())
}

export function equalsTestAnnotation<V>(x: TestAnnotation<V>, y: TestAnnotation<V>): boolean {
  return x.hashCode === y.hashCode
}

export const Ignored                         = tag<number>()
export const ignored: TestAnnotation<number> = new TestAnnotation(Ignored, 'ignored', 0, (x, y) => x + y)

export const Repeated                         = tag<number>()
export const repeated: TestAnnotation<number> = new TestAnnotation(Repeated, 'repeated', 0, (x, y) => x + y)

export const Retried                         = tag<number>()
export const retried: TestAnnotation<number> = new TestAnnotation(Retried, 'retried', 0, (x, y) => x + y)

export const Tagged                                      = tag<Set.HashSet<string>>()
export const tagged: TestAnnotation<Set.HashSet<string>> = new TestAnnotation(
  Tagged,
  'tagged',
  Set.make({ ...Eq.string, hash: hashString }),
  Set.union_
)

export const Timing                         = tag<number>()
export const timing: TestAnnotation<number> = new TestAnnotation(Timing, 'timing', 0, (x, y) => x + y)

export const Fibers = tag<Either<number, Chunk<URef<Set.HashSet<Fiber.RuntimeFiber<any, any>>>>>>()
export const fibers: TestAnnotation<
  Either<number, Chunk<URef<Set.HashSet<Fiber.RuntimeFiber<any, any>>>>>
> = new TestAnnotation(Fibers, 'fibers', E.left(0), compose_)

function compose_<A>(left: Either<number, Chunk<A>>, right: Either<number, Chunk<A>>): Either<number, Chunk<A>> {
  return E.isLeft(left)
    ? E.isLeft(right)
      ? E.left(left.left + right.left)
      : right
    : E.isRight(left)
    ? E.isRight(right)
      ? E.right(C.concat_(left.right, right.right))
      : right
    : absurd(undefined as never)
}
