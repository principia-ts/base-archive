import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain_, fail } from "../_core";
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
