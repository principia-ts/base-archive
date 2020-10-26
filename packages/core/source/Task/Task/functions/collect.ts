import { flow, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { chain_, fail, pure } from "../core";
import type { Task } from "../model";

export const _collectM = <R, E, A, R1, E1, A1, E2>(
   ef: Task<R, E, A>,
   f: () => E2,
   pf: (a: A) => Option<Task<R1, E1, A1>>
) =>
   chain_(
      ef,
      (a): Task<R1, E1 | E2, A1> =>
         pipe(
            pf(a),
            O.getOrElse(() => fail(f()))
         )
   );

export const collectM = <A, R1, E1, A1, E2>(f: () => E2, pf: (a: A) => Option<Task<R1, E1, A1>>) => <R, E>(
   ef: Task<R, E, A>
) => _collectM(ef, f, pf);

export const _collect = <R, E, A, E1, A1>(ef: Task<R, E, A>, f: () => E1, pf: (a: A) => Option<A1>) =>
   _collectM(ef, f, flow(pf, O.map(pure)));

export const collect = <A, E1, A1>(f: () => E1, pf: (a: A) => Option<A1>) => <R, E>(ef: Task<R, E, A>) =>
   _collect(ef, f, pf);
