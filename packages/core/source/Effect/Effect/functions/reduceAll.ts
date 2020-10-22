import * as A from "../../../Array";
import { NoSuchElementException } from "../../../GlobalExceptions";
import * as NA from "../../../NonEmptyArray";
import * as O from "../../../Option";
import { map_, mapBoth_ } from "../core";
import type { Effect } from "../model";
import { mergeAllPar_, mergeAllParN_ } from "./mergeAll";

export const reduceAll_ = <R, E, A>(as: NA.NonEmptyArray<Effect<R, E, A>>, f: (b: A, a: A) => A) =>
   A.reduce_(NA.tail(as), NA.head(as), (b, a) => mapBoth_(b, a, f));

export const reduceAll = <A>(f: (b: A, a: A) => A) => <R, E>(as: NA.NonEmptyArray<Effect<R, E, A>>) =>
   reduceAll_(as, f);

export const reduceAllPar_ = <R, E, A>(as: NA.NonEmptyArray<Effect<R, E, A>>, f: (b: A, a: A) => A) =>
   map_(
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
         throw new NoSuchElementException("Effect.reduceAllPar_");
      })
   );

export const reduceAllPar = <A>(f: (b: A, a: A) => A) => <R, E>(as: NA.NonEmptyArray<Effect<R, E, A>>) =>
   reduceAllPar_(as, f);

export const reduceAllParN_ = (n: number) => <R, E, A>(as: NA.NonEmptyArray<Effect<R, E, A>>, f: (b: A, a: A) => A) =>
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
         throw new NoSuchElementException("Effect.reduceAllParN_");
      })
   );

export const reduceAllParN = (n: number) => <A>(f: (b: A, a: A) => A) => <R, E>(
   as: NA.NonEmptyArray<Effect<R, E, A>>
) => reduceAllParN_(n)(as, f);
