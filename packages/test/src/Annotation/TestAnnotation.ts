import type { Chunk } from "@principia/core/Chunk";
import * as C from "@principia/core/Chunk";
import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import * as Eq from "@principia/core/Eq";
import type { Tag } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import type * as Fiber from "@principia/core/IO/Fiber";
import type { URef } from "@principia/core/IORef";
import * as Set from "@principia/core/Set";
import { absurd } from "@principia/prelude";

export class TestAnnotation<V> {
  constructor(
    readonly tag: Tag<V>,
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (v1: V, v2: V) => V
  ) {}

  readonly hashCode = Symbol.for([this.identifier, this.tag].toString());
}

export function equalsTestAnnotation<V>(x: TestAnnotation<V>, y: TestAnnotation<V>): boolean {
  return x.hashCode === y.hashCode;
}

export const Ignored = tag<number>();
export const ignored: TestAnnotation<number> = new TestAnnotation(
  Ignored,
  "ignored",
  0,
  (x, y) => x + y
);

export const Repeated = tag<number>();
export const repeated: TestAnnotation<number> = new TestAnnotation(
  Repeated,
  "repeated",
  0,
  (x, y) => x + y
);

export const Retried = tag<number>();
export const retried: TestAnnotation<number> = new TestAnnotation(
  Retried,
  "retried",
  0,
  (x, y) => x + y
);

export const Tagged = tag<ReadonlySet<string>>();
export const tagged: TestAnnotation<ReadonlySet<string>> = new TestAnnotation(
  Tagged,
  "tagged",
  Set.empty(),
  Set.union_(Eq.string)
);

export const Timing = tag<number>();
export const timing: TestAnnotation<number> = new TestAnnotation(
  Timing,
  "timing",
  0,
  (x, y) => x + y
);

export const Fibers = tag<Either<number, Chunk<URef<ReadonlySet<Fiber.RuntimeFiber<any, any>>>>>>();
export const fibers: TestAnnotation<
  Either<number, Chunk<URef<ReadonlySet<Fiber.RuntimeFiber<any, any>>>>>
> = new TestAnnotation(Fibers, "fibers", E.left(0), compose_);

function compose_<A>(
  left: Either<number, Chunk<A>>,
  right: Either<number, Chunk<A>>
): Either<number, Chunk<A>> {
  return E.isLeft(left)
    ? E.isLeft(right)
      ? E.left(left.left + right.left)
      : right
    : E.isRight(left)
    ? E.isRight(right)
      ? E.right(C.concat_(left.right, right.right))
      : right
    : absurd(undefined as never);
}
