import type { FreeBooleanAlgebra } from "./model";
import type { Either } from "@principia/base/data/Either";
import type { USync } from "@principia/io/Sync";

import * as B from "@principia/base/data/Boolean";
import * as E from "@principia/base/data/Either";
import * as O from "@principia/base/data/Option";
import * as Sy from "@principia/io/Sync";

import { success } from "./constructors";
import { and_, or_ } from "./operations";

export function foldSafe_<A, B>(
  ba: FreeBooleanAlgebra<A>,
  onValue: (a: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): USync<B> {
  return Sy.gen(function* (_) {
    switch (ba._tag) {
      case "Value":
        return onValue(ba.value);
      case "And":
        return onAnd(
          yield* _(foldSafe_(ba.left, onValue, onAnd, onOr, onNot)),
          yield* _(foldSafe_(ba.right, onValue, onAnd, onOr, onNot))
        );
      case "Or":
        return onOr(
          yield* _(foldSafe_(ba.left, onValue, onAnd, onOr, onNot)),
          yield* _(foldSafe_(ba.right, onValue, onAnd, onOr, onNot))
        );
      case "Not":
        return onNot(yield* _(foldSafe_(ba.result, onValue, onAnd, onOr, onNot)));
    }
  });
}

export function fold_<A, B>(
  ba: FreeBooleanAlgebra<A>,
  onValue: (_: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): B {
  return Sy.unsafeRun(foldSafe_(ba, onValue, onAnd, onOr, onNot));
}

export function fold<A, B>(
  onValue: (_: A) => B,
  onAnd: (_: B, __: B) => B,
  onOr: (_: B, __: B) => B,
  onNot: (_: B) => B
): (ba: FreeBooleanAlgebra<A>) => B {
  return (ba) => fold_(ba, onValue, onAnd, onOr, onNot);
}

export function isTrue<A>(ba: FreeBooleanAlgebra<A>): boolean {
  return fold_(ba, (): boolean => true, B.and_, B.or_, B.invert);
}

export function isFalse<A>(ba: FreeBooleanAlgebra<A>): boolean {
  return !isTrue(ba);
}

export function failures<A>(ba: FreeBooleanAlgebra<A>): O.Option<FreeBooleanAlgebra<A>> {
  return E.fold_(
    fold_<A, Either<FreeBooleanAlgebra<A>, FreeBooleanAlgebra<A>>>(
      ba,
      (a) => E.right(success(a)),
      (l, r) =>
        E.isRight(l)
          ? E.isRight(r)
            ? E.right(and_(l.right, r.right))
            : r
          : E.isRight(r)
          ? l
          : E.left(and_(l.left, r.left)),
      (l, r) =>
        E.isRight(l)
          ? E.isRight(r)
            ? E.right(or_(l.right, r.right))
            : l
          : E.isRight(r)
          ? r
          : E.left(or_(l.left, r.left)),
      E.swap
    ),
    O.some,
    () => O.none()
  );
}
