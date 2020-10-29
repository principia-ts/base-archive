import { bind_, bindTo_, flow, pipe } from "../../Function";
import { succeed } from "./constructors";
import { map, map_ } from "./functor";
import type { IO, Task } from "./model";
import { chain } from "./monad";

/*
 * -------------------------------------------
 * Do Task
 * -------------------------------------------
 */

const of: IO<{}> = succeed({});
export { of as do };

export const bindS = <R, E, A, K, N extends string>(
   name: Exclude<N, keyof K>,
   f: (_: K) => Task<R, E, A>
): (<R2, E2>(
   mk: Task<R2, E2, K>
) => Task<
   R & R2,
   E | E2,
   {
      [k in N | keyof K]: k extends keyof K ? K[k] : A;
   }
>) =>
   chain((a) =>
      pipe(
         f(a),
         map((b) => bind_(a, name, b))
      )
   );

export const bindTo = <K, N extends string>(name: Exclude<N, keyof K>) => <R, E, A>(
   fa: Task<R, E, A>
): Task<R, E, { [k in Exclude<N, keyof K>]: A }> => map_(fa, bindTo_(name));

export const letS = <K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) =>
   bindS(name, flow(f, succeed));
