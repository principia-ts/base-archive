import type { IO } from "../core";
import type * as NA from "@principia/base/data/NonEmptyArray";

import * as O from "@principia/base/data/Option";
import { NoSuchElementException } from "@principia/base/util/GlobalExceptions";

import { map_ } from "../core";
import { mergeAllPar_ } from "./mergeAllPar";

export function reduceAllPar_<R, E, A>(as: NA.NonEmptyArray<IO<R, E, A>>, f: (b: A, a: A) => A) {
  return map_(
    mergeAllPar_(as, O.none<A>(), (b, a) =>
      O.some(
        O.fold_(
          b,
          () => a,
          (el) => f(el, a)
        )
      )
    ),
    O.getOrElse(() => {
      throw new NoSuchElementException("IO.reduceAllPar_");
    })
  );
}

export function reduceAllPar<A>(
  f: (b: A, a: A) => A
): <R, E>(as: NA.NonEmptyArray<IO<R, E, A>>) => IO<R, E, A> {
  return (as) => reduceAllPar_(as, f);
}
