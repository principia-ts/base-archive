import { identity, pipe } from "../../Function";
import { map } from "./functor";
import { isFailure } from "./guards";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Monad Exit
 * -------------------------------------------
 */

export const chain_ = <E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, B> =>
   isFailure(ma) ? ma : f(ma.value);

export const chain = <A, G, B>(f: (a: A) => Exit<G, B>) => <E>(fa: Exit<E, A>): Exit<E | G, B> => chain_(fa, f);

export const flatten = <E, G, A>(mma: Exit<E, Exit<G, A>>): Exit<E | G, A> => chain_(mma, identity);

export const tap_ = <E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, A> =>
   chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

export const tap = <A, G, B>(f: (a: A) => Exit<G, B>) => <E>(ma: Exit<E, A>): Exit<E | G, A> => tap_(ma, f);
