import { map_, mapBoth_ } from "../_core";
import * as A from "../../../Array/_core";
import { NoSuchElementException } from "../../../GlobalExceptions";
import * as NA from "../../../NonEmptyArray";
import * as O from "../../../Option";
import type { Task } from "../model";
import { mergeAllPar_, mergeAllParN_ } from "./mergeAll";

export function reduceAll_<R, E, A>(as: NA.NonEmptyArray<Task<R, E, A>>, f: (b: A, a: A) => A) {
  return A.reduce_(NA.tail(as), NA.head(as), (b, a) => mapBoth_(b, a, f));
}

export function reduceAll<A>(
  f: (b: A, a: A) => A
): <R, E>(as: NA.NonEmptyArray<Task<R, E, A>>) => Task<R, E, A> {
  return (as) => reduceAll_(as, f);
}

export function reduceAllPar_<R, E, A>(as: NA.NonEmptyArray<Task<R, E, A>>, f: (b: A, a: A) => A) {
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
      throw new NoSuchElementException("Task.reduceAllPar_");
    })
  );
}

export function reduceAllPar<A>(
  f: (b: A, a: A) => A
): <R, E>(as: NA.NonEmptyArray<Task<R, E, A>>) => Task<R, E, A> {
  return (as) => reduceAllPar_(as, f);
}

export function reduceAllParN_(n: number) {
  return <R, E, A>(as: NA.NonEmptyArray<Task<R, E, A>>, f: (b: A, a: A) => A) =>
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
        throw new NoSuchElementException("Task.reduceAllParN_");
      })
    );
}

export function reduceAllParN(
  n: number
): <A>(f: (b: A, a: A) => A) => <R, E>(as: NA.NonEmptyArray<Task<R, E, A>>) => Task<R, E, A> {
  return (f) => (as) => reduceAllParN_(n)(as, f);
}
