import { pipe } from "../../../Function";
import { bindS, map, of } from "../core";
import type { Effect } from "../model";

export const summarized_ = <R, E, A, R1, E1, B, C>(
   self: Effect<R, E, A>,
   summary: Effect<R1, E1, B>,
   f: (start: B, end: B) => C
): Effect<R & R1, E | E1, [C, A]> =>
   pipe(
      of,
      bindS("start", () => summary),
      bindS("value", () => self),
      bindS("end", () => summary),
      map((s) => [f(s.start, s.end), s.value])
   );

export const summarized = <R1, E1, B, C>(summary: Effect<R1, E1, B>, f: (start: B, end: B) => C) => <R, E, A>(
   self: Effect<R, E, A>
): Effect<R & R1, E | E1, [C, A]> => summarized_(self, summary, f);
