import { identity, pipe } from "../../Function";
import { map } from "./functor";
import { isFailure } from "./guards";
import type { Exit } from "./model";

/*
 * -------------------------------------------
 * Monad Exit
 * -------------------------------------------
 */

export function chain_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, B> {
  return isFailure(ma) ? ma : f(ma.value);
}

export function chain<A, G, B>(f: (a: A) => Exit<G, B>): <E>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => chain_(fa, f);
}

export function flatten<E, G, A>(mma: Exit<E, Exit<G, A>>): Exit<E | G, A> {
  return chain_(mma, identity);
}

export function tap_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, A> {
  return chain_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  );
}

export function tap<A, G, B>(f: (a: A) => Exit<G, B>): <E>(ma: Exit<E, A>) => Exit<G | E, A> {
  return (ma) => tap_(ma, f);
}
