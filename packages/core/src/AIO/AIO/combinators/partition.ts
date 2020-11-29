import type { Separated } from "@principia/prelude/Utils";

import { identity } from "../../../Function";
import * as I from "../../../Iterable";
import { foreach_, map_ } from "../_core";
import type { AIO } from "../model";
import { either } from "./either";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => AIO<R, E, B>
): AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return map_(
    foreach_(as, (a) => either(f(a))),
    I.partitionMap(identity)
  );
}

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in a separated fashion.
 */
export function partition<R, E, A, B>(
  f: (a: A) => AIO<R, E, B>
): (fas: Iterable<A>) => AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return (fas) => partition_(fas, f);
}

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => AIO<R, E, B>
): AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return map_(
    foreachPar_(as, (a) => either(f(a))),
    I.partitionMap(identity)
  );
}

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 */
export function partitionPar<R, E, A, B>(
  f: (a: A) => AIO<R, E, B>
): (as: Iterable<A>) => AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return (as) => partitionPar_(as, f);
}

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export function partitionParN_(
  n: number
): <R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => AIO<R, E, B>
) => AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return (as, f) =>
    map_(
      foreachParN_(n)(as, (a) => either(f(a))),
      I.partitionMap(identity)
    );
}

/**
 * Feeds elements of type `A` to a function `f` that returns an AIO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export function partitionParN(
  n: number
): <R, E, A, B>(
  f: (a: A) => AIO<R, E, B>
) => (as: Iterable<A>) => AIO<R, never, Separated<Iterable<E>, Iterable<B>>> {
  return (f) => (as) => partitionParN_(n)(as, f);
}
