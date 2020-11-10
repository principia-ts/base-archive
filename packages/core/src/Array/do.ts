import { bind_, bindTo_, flow, pipe } from "../Function";
import { pure } from "./applicative";
import { map, map_ } from "./functor";
import { chain } from "./monad";

/*
 * -------------------------------------------
 * Do Array
 * -------------------------------------------
 */

const of: ReadonlyArray<{}> = pure({});
export { of as do };

export const bindS = <A, K, N extends string>(
   name: Exclude<N, keyof K>,
   f: (_: K) => ReadonlyArray<A>
): ((
   mk: ReadonlyArray<K>
) => ReadonlyArray<
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
   fa: ReadonlyArray<A>
): ReadonlyArray<{ [k in Exclude<N, keyof K>]: A }> => map_(fa, bindTo_(name));

export const letS = <K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) => bindS(name, flow(f, pure));
