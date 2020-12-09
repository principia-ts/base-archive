import { NoSuchElementException } from "../../GlobalExceptions";
import type * as NA from "../../NonEmptyArray";
import * as O from "../../Option";
import { map_ } from "../_core";
import type { IO } from "../model";
import { mergeAllParN_ } from "./mergeAllParN";

export function reduceAllParN_(n: number) {
  return <R, E, A>(as: NA.NonEmptyArray<IO<R, E, A>>, f: (b: A, a: A) => A) =>
    map_(
      mergeAllParN_(n)(as, O.none<A>(), (ob, a) =>
        O.some(
          O.fold_(
            ob,
            () => a,
            (b) => f(b, a)
          )
        )
      ),
      O.getOrElse(() => {
        throw new NoSuchElementException("IO.reduceAllParN_");
      })
    );
}

export function reduceAllParN(
  n: number
): <A>(f: (b: A, a: A) => A) => <R, E>(as: NA.NonEmptyArray<IO<R, E, A>>) => IO<R, E, A> {
  return (f) => (as) => reduceAllParN_(n)(as, f);
}
