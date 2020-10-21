import { flow, identity, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { foreachUnitPar_ } from "../../Parallel";
import { chain_, fail, foreach_, foreachUnit_, pure } from "../core";
import type { Effect } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";
import { foreachUnitParN_ } from "./foreachUnitParN";

export const _collectM = <R, E, A, R1, E1, A1, E2>(
   ef: Effect<R, E, A>,
   f: () => E2,
   pf: (a: A) => Option<Effect<R1, E1, A1>>
) =>
   chain_(
      ef,
      (a): Effect<R1, E1 | E2, A1> =>
         pipe(
            pf(a),
            O.getOrElse(() => fail(f()))
         )
   );

export const collectM = <A, R1, E1, A1, E2>(f: () => E2, pf: (a: A) => Option<Effect<R1, E1, A1>>) => <R, E>(
   ef: Effect<R, E, A>
) => _collectM(ef, f, pf);

export const _collect = <R, E, A, E1, A1>(ef: Effect<R, E, A>, f: () => E1, pf: (a: A) => Option<A1>) =>
   _collectM(ef, f, flow(pf, O.map(pure)));

export const collect = <A, E1, A1>(f: () => E1, pf: (a: A) => Option<A1>) => <R, E>(ef: Effect<R, E, A>) =>
   _collect(ef, f, pf);

export const collectAll = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreach_(efs, identity);

export const collectAllPar = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachPar_(efs, identity);

export const collectAllParN = (n: number) => <R, E, A>(efs: Iterable<Effect<R, E, A>>) =>
   foreachParN_(n)(efs, identity);

export const collectAllUnit = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachUnit_(efs, identity);

export const collectAllUnitPar = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachUnitPar_(efs, identity);

export const collectAllUnitParN = (n: number) => <R, E, A>(efs: Iterable<Effect<R, E, A>>) =>
   foreachUnitParN_(n)(efs, identity);
