import { bind_, bindTo_, flow, pipe } from "../../Function";
import { succeed } from "./constructors";
import { map, map_ } from "./functor";
import type { AIO, IO } from "./model";
import { chain } from "./monad";

/*
 * -------------------------------------------
 * Do AIO
 * -------------------------------------------
 */

const of: IO<{}> = succeed({});
export { of as do };

export function bindS<R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => AIO<R, E, A>
): <R2, E2>(
  mk: AIO<R2, E2, K>
) => AIO<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A;
  }
> {
  return chain((a) =>
    pipe(
      f(a),
      map((b) => bind_(a, name, b))
    )
  );
}

export function bindTo<K, N extends string>(
  name: Exclude<N, keyof K>
): <R, E, A>(fa: AIO<R, E, A>) => AIO<R, E, { [k in Exclude<N, keyof K>]: A }> {
  return (fa) => map_(fa, bindTo_(name));
}

export function letS<K, N extends string, A>(name: Exclude<N, keyof K>, f: (_: K) => A) {
  return bindS(name, flow(f, succeed));
}
