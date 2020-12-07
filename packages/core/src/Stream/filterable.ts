import type { Chunk } from "../Chunk";
import * as C from "../Chunk";
import { flow } from "../Function";
import type { IO } from "../IO";
import * as I from "../IO";
import * as M from "../Managed";
import type { Option } from "../Option";
import * as O from "../Option";
import * as BPull from "./BufferedPull";
import { mapChunks_ } from "./functor";
import { Stream } from "./model";

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
