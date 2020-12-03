import * as I from "../IO";
import * as M from "../Managed";
import { Option } from "../Option";
import { mapChunks_ } from "./functor";
import * as A from "../Array";
import { Stream } from "./model";
import * as O from "../Option";
import { IO } from "../IO";
import * as BPull from "./BufferedPull";
import { flow, pipe } from "../Function";

export function filterMap_<R, E, O, O1>(
  fa: Stream<R, E, O>,
  f: (o: O) => Option<O1>
): Stream<R, E, O1> {
  return mapChunks_(fa, A.filterMap(f));
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
      const go = (): IO<R & R1, O.Option<E | E1>, ReadonlyArray<O1>> =>
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
