import { pipe } from "../../../Function";
import { bindS, map, of } from "../core";
import type { Task } from "../model";

export const summarized_ = <R, E, A, R1, E1, B, C>(
   self: Task<R, E, A>,
   summary: Task<R1, E1, B>,
   f: (start: B, end: B) => C
): Task<R & R1, E | E1, [C, A]> =>
   pipe(
      of,
      bindS("start", () => summary),
      bindS("value", () => self),
      bindS("end", () => summary),
      map((s) => [f(s.start, s.end), s.value])
   );

export const summarized = <R1, E1, B, C>(summary: Task<R1, E1, B>, f: (start: B, end: B) => C) => <R, E, A>(
   self: Task<R, E, A>
): Task<R & R1, E | E1, [C, A]> => summarized_(self, summary, f);
