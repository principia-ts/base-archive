import { flow, pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain_, fail, pure } from "../_core";
import type { IO } from "../model";

export function collectM_<R, E, A, R1, E1, A1, E2>(
  ef: IO<R, E, A>,
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1 | E2, A1> {
  return chain_(
    ef,
    (a): IO<R1, E1 | E2, A1> =>
      pipe(
        pf(a),
        O.getOrElse(() => fail(f()))
      )
  );
}

export function collectM<A, R1, E1, A1, E2>(
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): <R, E>(ef: IO<R, E, A>) => IO<R & R1, E1 | E2 | E, A1> {
  return (ef) => collectM_(ef, f, pf);
}

export function collect_<R, E, A, E1, A1>(
  ef: IO<R, E, A>,
  f: () => E1,
  pf: (a: A) => Option<A1>
): IO<R, E | E1, A1> {
  return collectM_(ef, f, flow(pf, O.map(pure)));
}

export function collect<A, E1, A1>(
  f: () => E1,
  pf: (a: A) => Option<A1>
): <R, E>(ef: IO<R, E, A>) => IO<R, E1 | E, A1> {
  return (ef) => collect_(ef, f, pf);
}
