import * as A from "../../Array";
import { pipe } from "../../Function";
import * as O from "../../Option";
import { mapBothCause } from "./apply";
import { first_ } from "./bifunctor";
import * as C from "./Cause";
import { map, map_ } from "./functor";
import type { Exit } from "./model";

export const as_ = <E, A, B>(fa: Exit<E, A>, b: B): Exit<E, B> => map_(fa, () => b);

export const as = <B>(b: B): (<E, A>(fa: Exit<E, A>) => Exit<E, B>) => map(() => b);

export const collectAll = <E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, ReadonlyArray<A>>> =>
   pipe(
      A.head(exits),
      O.map((head) =>
         pipe(
            A.dropLeft_(exits, 1),
            A.reduce(
               pipe(
                  head,
                  map((x): ReadonlyArray<A> => [x])
               ),
               (acc, el) =>
                  pipe(
                     acc,
                     mapBothCause(el, (acc, el) => [el, ...acc], C.then)
                  )
            ),
            map(A.reverse)
         )
      )
   );

export const collectAllPar = <E, A>(...exits: ReadonlyArray<Exit<E, A>>): O.Option<Exit<E, readonly A[]>> =>
   pipe(
      A.head(exits),
      O.map((head) =>
         pipe(
            A.dropLeft_(exits, 1),
            A.reduce(
               pipe(
                  head,
                  map((x): ReadonlyArray<A> => [x])
               ),
               (acc, el) =>
                  pipe(
                     acc,
                     mapBothCause(el, (acc, el) => [el, ...acc], C.both)
                  )
            ),
            map(A.reverse)
         )
      )
   );

export const orElseFail_ = <E, A, G>(exit: Exit<E, A>, orElse: G) => first_(exit, () => orElse);

export const orElseFail = <G>(orElse: G) => <E, A>(exit: Exit<E, A>): Exit<G, A> => orElseFail_(exit, orElse);
