import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { fail, flatMap_ } from "../core";

export function collectM_<R, E, A, R1, E1, A1, E2>(
  ef: IO<R, E, A>,
  f: () => E2,
  pf: (a: A) => Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1 | E2, A1> {
  return flatMap_(
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
