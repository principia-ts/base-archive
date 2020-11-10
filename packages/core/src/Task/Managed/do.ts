import { bind_, bindTo_, flow, pipe } from "../../Function";
import { succeed } from "./constructors";
import { map, map_ } from "./functor";
import type { Managed } from "./model";
import { chain } from "./monad";

const of = succeed({});
export { of as do };

export const bindS = <R, E, A, K, N extends string>(
   name: Exclude<N, keyof K>,
   f: (_: K) => Managed<R, E, A>
): (<R2, E2>(
   mk: Managed<R2, E2, K>
) => Managed<
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
   fa: Managed<R, E, A>
): Managed<R, E, { [k in Exclude<N, keyof K>]: A }> => map_(fa, bindTo_(name));

export const letS = <K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) =>
   bindS(name, flow(f, succeed));
