import { identity, tuple } from "../../Function";
import type { ReadonlyRecord } from "../../Record";
import * as R from "../../Record";
import type { EnforceNonEmptyRecord } from "../../Utils";
import type { _E, _R } from "../../Utils/infer";
import { parallel, sequential } from "../ExecutionStrategy";
import { map_, mapM_ } from "./_core";
import * as T from "./_internal/task";
import { foreachPar_ } from "./combinators/foreachPar";
import { foreachParN_ } from "./combinators/foreachParN";
import { makeManagedReleaseMap } from "./combinators/makeManagedReleaseMap";
import type { Managed } from "./model";

/*
 * -------------------------------------------
 * Parallel Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function mapBothPar_<R, E, A, R1, E1, B, C>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): Managed<R & R1, E | E1, C> {
  return mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
    const innerMap = T.gives_(makeManagedReleaseMap(sequential).task, (r: R & R1) =>
      tuple(r, parallelReleaseMap)
    );

    return T.chain_(T.both_(innerMap, innerMap), ([[_, l], [__, r]]) =>
      T.mapBothPar_(
        T.gives_(fa.task, (_: R & R1) => tuple(_, l)),
        T.gives_(fb.task, (_: R & R1) => tuple(_, r)),
        ([_, a], [__, a2]) => f(a, a2)
      )
    );
  });
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function mapBothPar<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => mapBothPar_(fa, fb, f);
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Managed<R1, E1, (a: A) => B>,
  fa: Managed<R, E, A>
): Managed<R & R1, E | E1, B> {
  return mapBothPar_(fab, fa, (f, a) => f(a));
}

export function apPar<R, E, A>(
  fa: Managed<R, E, A>
): <R1, E1, B>(fab: Managed<R1, E1, (a: A) => B>) => Managed<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa);
}

export function apFirstPar_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> {
  return mapBothPar_(fa, fb, (a, _) => a);
}

export function apFirstPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return mapBothPar_(fa, fb, (_, b) => b);
}

export function apSecondPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => apSecondPar_(fa, fb);
}

export function structPar<MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never;
  }
> {
  return map_(
    foreachPar_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const r = {};
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i];
        r[k] = v;
      }
      return r;
    }
  ) as any;
}

export function structParN(n: number) {
  return <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
    mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
  ): Managed<
    _R<MR[keyof MR]>,
    _E<MR[keyof MR]>,
    {
      [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never;
    }
  > =>
    map_(
      foreachParN_(n)(
        R.collect_(mr, (k, v) => [k, v] as const),
        ([k, v]) => map_(v, (a) => [k, a] as const)
      ),
      (kvs) => {
        const r = {};
        for (let i = 0; i < kvs.length; i++) {
          const [k, v] = kvs[i];
          r[k] = v;
        }
        return r;
      }
    ) as any;
}

export function tuplePar<T extends ReadonlyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>;
  }
): Managed<
  _R<T[number]>,
  _E<T[number]>,
  {
    [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never;
  }
> {
  return foreachPar_(t, identity) as any;
}

export function tupleParN(n: number) {
  return <T extends ReadonlyArray<Managed<any, any, any>>>(
    ...t: T & {
      0: Managed<any, any, any>;
    }
  ): Managed<
    _R<T[number]>,
    _E<T[number]>,
    {
      [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never;
    }
  > => foreachParN_(n)(t, identity) as any;
}
