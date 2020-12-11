import type { Chunk } from "../Chunk";
import * as C from "../Chunk";
import type { Predicate, Refinement } from "../Function";
import { flow, not } from "../Function";
import type { IO } from "../IO";
import * as I from "../IO";
import * as M from "../Managed";
import type { Option } from "../Option";
import * as O from "../Option";
import * as BPull from "./BufferedPull";
import { mapChunks_ } from "./functor";
import { Stream } from "./model";
import type * as Pull from "./Pull";

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter<O, O1 extends O>(
  f: Refinement<O, O1>
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1>;
export function filter<O>(f: Predicate<O>): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O>;
export function filter<O>(f: Predicate<O>): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O> {
  return <R, E>(fa: Stream<R, E, O>): Stream<R, E, O> => filter_(fa, f);
}

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter_<R, E, O, O1 extends O>(
  fa: Stream<R, E, O>,
  f: Refinement<O, O1>
): Stream<R, E, O1>;
export function filter_<R, E, O>(fa: Stream<R, E, O>, f: Predicate<O>): Stream<R, E, O>;
export function filter_<R, E, O>(fa: Stream<R, E, O>, f: Predicate<O>): Stream<R, E, O> {
  return mapChunks_(fa, C.filter(f));
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM_<R, R1, E, E1, O>(
  fa: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, O> {
  return new Stream(
    M.map_(M.mapM_(fa.proc, BPull.make), (os) => {
      const pull: Pull.Pull<R & R1, E | E1, O> = I.chain_(BPull.pullElement(os), (o) =>
        I.chain_(
          I.mapError_(f(o), (v) => O.some(v)),
          (_) => {
            if (_) {
              return I.succeed(C.single(o));
            } else {
              return pull;
            }
          }
        )
      );

      return pull;
    })
  );
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM<R1, E1, O>(f: (o: O) => I.IO<R1, E1, boolean>) {
  return <R, E>(fa: Stream<R, E, O>) => filterM_(fa, f);
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, O>(fa: Stream<R, E, O>, pred: Predicate<O>): Stream<R, E, O> {
  return filter_(fa, not(pred));
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot<O>(pred: Predicate<O>) {
  return <R, E>(fa: Stream<R, E, O>) => filterNot_(fa, pred);
}

export function filterMap_<R, E, O, O1>(
  fa: Stream<R, E, O>,
  f: (o: O) => Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(fa, C.filterMap(f));
}

export function filterMap<O, O1>(
  f: (o: O) => Option<O1>
): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O1> {
  return (fa) => filterMap_(fa, f);
}

export function filterMapM_<R, E, O, R1, E1, O1>(
  fa: Stream<R, E, O>,
  f: (o: O) => Option<IO<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    M.gen(function* (_) {
      const os = yield* _(M.mapM_(fa.proc, BPull.make));
      const go = (): IO<R & R1, O.Option<E | E1>, Chunk<O1>> =>
        I.chain_(
          BPull.pullElement(os),
          flow(
            f,
            O.fold(
              go,
              I.bimap(O.some, (o1) => [o1])
            )
          )
        );
      return go();
    })
  );
}

export function filterMapM<O, R1, E1, O1>(
  f: (o: O) => Option<IO<R1, E1, O1>>
): <R, E>(fa: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (fa) => filterMapM_(fa, f);
}
