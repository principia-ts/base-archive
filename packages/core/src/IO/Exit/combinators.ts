import * as A from "../../Array/_core";
import { pipe } from "../../Function";
import * as O from "../../Option";
import * as C from "../Cause";
import { zipWithCause } from "./apply";
import { mapError_ } from "./bifunctor";
import {failure} from "./constructors";
import { map, map_ } from "./functor";
import type { Exit } from "./model";

export function as_<E, A, B>(fa: Exit<E, A>, b: B): Exit<E, B> {
  return map_(fa, () => b);
}

export function as<B>(b: B): <E, A>(fa: Exit<E, A>) => Exit<E, B> {
  return map(() => b);
}

export function collectAll<E, A>(
  ...exits: ReadonlyArray<Exit<E, A>>
): O.Option<Exit<E, ReadonlyArray<A>>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.reduce(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) =>
            pipe(
              acc,
              zipWithCause(el, (acc, el) => [el, ...acc], C.then)
            )
        ),
        map(A.reverse)
      )
    )
  );
}

export function collectAllPar<E, A>(
  ...exits: ReadonlyArray<Exit<E, A>>
): O.Option<Exit<E, readonly A[]>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.reduce(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) =>
            pipe(
              acc,
              zipWithCause(el, (acc, el) => [el, ...acc], C.both)
            )
        ),
        map(A.reverse)
      )
    )
  );
}

export function orElseFail_<E, A, G>(exit: Exit<E, A>, orElse: G) {
  return mapError_(exit, () => orElse);
}

export function orElseFail<G>(orElse: G): <E, A>(exit: Exit<E, A>) => Exit<G, A> {
  return (exit) => orElseFail_(exit, orElse);
}

export function untraced<E, A>(exit: Exit<E, A>): Exit<E, A> {
  return exit._tag === "Success" ? exit : failure(C.untraced(exit.cause));
}
