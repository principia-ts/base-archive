import { flow } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { succeed } from "../_core";
import type { IO } from "../model";
import { collectM_ } from "./collectM";

export function collect_<R, E, A, E1, A1>(
  ef: IO<R, E, A>,
  f: () => E1,
  pf: (a: A) => Option<A1>
): IO<R, E | E1, A1> {
  return collectM_(ef, f, flow(pf, O.map(succeed)));
}

export function collect<A, E1, A1>(
  f: () => E1,
  pf: (a: A) => Option<A1>
): <R, E>(ef: IO<R, E, A>) => IO<R, E1 | E, A1> {
  return (ef) => collect_(ef, f, pf);
}
