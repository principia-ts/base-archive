import { NoSuchElementException } from "../../GlobalExceptions";
import type * as NA from "../../NonEmptyArray";
import * as O from "../../Option";
import { map_ } from "../_core";
import type { IO } from "../model";
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
