import type { Apply, ApplyComposition } from './Apply'
import type { Functor } from './Functor'
import type { Unit, UnitComposition } from './Unit'
import type { EnforceNonEmptyRecord } from './util/types'

import { getApplyComposition } from './Apply'
import * as A from './Array'
import { constant, pipe, tuple } from './Function'
import * as HKT from './HKT'

export interface Applicative<F extends HKT.URIS, TC = HKT.Auto> extends Apply<F, TC>, Unit<F, TC> {
  readonly pure: PureFn<F, TC>
}

export interface ApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>
  extends ApplyComposition<F, G, TCF, TCG>,
    UnitComposition<F, G, TCF, TCG> {
  readonly pure: PureFnComposition<F, G, TCF, TCG>
}

export function getApplicativeComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>(
  F: Applicative<F, TCF>,
  G: Applicative<G, TCG>
): ApplicativeComposition<F, G, TCF, TCG>
export function getApplicativeComposition<F, G>(F: Applicative<HKT.UHKT<F>>, G: Applicative<HKT.UHKT<G>>) {
  return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getApplyComposition(F, G),
    unit: () => F.map_(F.unit(), G.unit),
    pure: (a) => F.pure(G.pure(a))
  })
}

export interface PureFn<F extends HKT.URIS, C = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<C, 'N'>,
    K = HKT.Initial<C, 'K'>,
    Q = HKT.Initial<C, 'Q'>,
    W = HKT.Initial<C, 'W'>,
    X = HKT.Initial<C, 'X'>,
    I = HKT.Initial<C, 'I'>,
    S = HKT.Initial<C, 'S'>,
    R = HKT.Initial<C, 'R'>,
    E = HKT.Initial<C, 'E'>
  >(
    a: A
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
}

export interface PureFnComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto> {
  <
    A,
    N extends string = HKT.Initial<CF, 'N'>,
    K = HKT.Initial<CF, 'K'>,
    Q = HKT.Initial<CF, 'Q'>,
    W = HKT.Initial<CF, 'W'>,
    X = HKT.Initial<CF, 'X'>,
    I = HKT.Initial<CF, 'I'>,
    S = HKT.Initial<CF, 'S'>,
    R = HKT.Initial<CF, 'R'>,
    E = HKT.Initial<CF, 'E'>
  >(
    a: A
  ): HKT.Kind<
    F,
    CF,
    N,
    K,
    Q,
    W,
    X,
    I,
    S,
    R,
    E,
    HKT.Kind<
      G,
      CG,
      HKT.Initial<CG, 'N'>,
      HKT.Initial<CG, 'K'>,
      HKT.Initial<CG, 'Q'>,
      HKT.Initial<CG, 'W'>,
      HKT.Initial<CG, 'X'>,
      HKT.Initial<CG, 'I'>,
      HKT.Initial<CG, 'S'>,
      HKT.Initial<CG, 'R'>,
      HKT.Initial<CG, 'E'>,
      A
    >
  >
}

export function pureF<F extends HKT.URIS, TC = HKT.Auto>(F: Functor<F, TC> & Unit<F, TC>): PureFn<F, TC>
export function pureF<F>(F: Functor<HKT.UHKT<F>> & Unit<HKT.UHKT<F>>): PureFn<HKT.UHKT<F>> {
  return (a) => F.map_(F.unit(), constant(a))
}

export interface MapNFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    B,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ): (
    ...t: KT
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

export interface MapNFn_<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): <B>(
    f: (...as: { [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]> }) => B
  ) => HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    B
  >
}

/**
 * ```haskell
 * mapNF :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNFn<F, C>
export function mapNF<F>(F: Apply<HKT.UHKT<F>>): MapNFn<HKT.UHKT<F>> {
  return (f) => (...t) => F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

/**
 * ```haskell
 * mapNF_ :: Apply f => (fa, fb, ...) -> ([a, b, ...] -> c) -> f c
 * ```
 *
 * Combines a tuple of the given `Apply` member and maps with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export function mapNF_<F extends HKT.URIS, C = HKT.Auto>(A: Apply<F, C>): MapNFn_<F, C>
export function mapNF_<F>(F: Apply<HKT.UHKT<F>>): MapNFn_<HKT.UHKT<F>> {
  return (...t) => (f) => F.map_(sequenceTF(F)(...(t as any)), (as) => f(...(as as any)))
}

export interface SequenceSFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KS extends Readonly<
      Record<
        string,
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    >,
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    r: EnforceNonEmptyRecord<KS> &
      Readonly<
        Record<
          string,
          HKT.Kind<
            F,
            TC,
            HKT.Intro<TC, 'N', N, any>,
            HKT.Intro<TC, 'K', K, any>,
            HKT.Intro<TC, 'Q', Q, any>,
            HKT.Intro<TC, 'W', W, any>,
            HKT.Intro<TC, 'X', X, any>,
            HKT.Intro<TC, 'I', I, any>,
            HKT.Intro<TC, 'S', S, any>,
            HKT.Intro<TC, 'R', R, any>,
            HKT.Intro<TC, 'E', E, any>,
            unknown
          >
        >
      >
  ): HKT.Kind<
    F,
    TC,
    InferMixStruct<F, TC, 'N', N, KS>,
    InferMixStruct<F, TC, 'K', K, KS>,
    InferMixStruct<F, TC, 'Q', Q, KS>,
    InferMixStruct<F, TC, 'W', W, KS>,
    InferMixStruct<F, TC, 'X', X, KS>,
    InferMixStruct<F, TC, 'I', I, KS>,
    InferMixStruct<F, TC, 'S', S, KS>,
    InferMixStruct<F, TC, 'R', R, KS>,
    InferMixStruct<F, TC, 'E', E, KS>,
    {
      [K in keyof KS]: HKT.Infer<F, TC, 'A', KS[K]>
    }
  >
}

export function sequenceSF<F extends HKT.URIS, C = HKT.Auto>(F: Applicative<F, C>): SequenceSFn<F, C>
export function sequenceSF<F>(F: Applicative<HKT.UHKT<F>>) {
  return (r: Record<string, HKT.HKT<F, any>>): HKT.HKT<F, Record<string, any>> =>
    pipe(
      Object.keys(r),
      A.map((k) => tuple(k, r[k])),
      A.foldr(F.pure(A.empty<readonly [string, any]>()), (a, b) =>
        F.crossWith_(b, a[1], ([x, y]) => [...x, tuple(a[0], y)])
      ),
      F.map((a) => {
        const res = {}
        for (let i = 0; i < a.length; i++) {
          // eslint-disable-next-line functional/immutable-data
          res[a[i][0]] = a[i][1]
        }
        return res
      })
    )
}

export interface SequenceTFn<F extends HKT.URIS, TC = HKT.Auto> {
  <
    KT extends readonly [
      HKT.Kind<
        F,
        TC,
        HKT.Intro<TC, 'N', N, any>,
        HKT.Intro<TC, 'K', K, any>,
        HKT.Intro<TC, 'Q', Q, any>,
        HKT.Intro<TC, 'W', W, any>,
        HKT.Intro<TC, 'X', X, any>,
        HKT.Intro<TC, 'I', I, any>,
        HKT.Intro<TC, 'S', S, any>,
        HKT.Intro<TC, 'R', R, any>,
        HKT.Intro<TC, 'E', E, any>,
        unknown
      >,
      ...ReadonlyArray<
        HKT.Kind<
          F,
          TC,
          HKT.Intro<TC, 'N', N, any>,
          HKT.Intro<TC, 'K', K, any>,
          HKT.Intro<TC, 'Q', Q, any>,
          HKT.Intro<TC, 'W', W, any>,
          HKT.Intro<TC, 'X', X, any>,
          HKT.Intro<TC, 'I', I, any>,
          HKT.Intro<TC, 'S', S, any>,
          HKT.Intro<TC, 'R', R, any>,
          HKT.Intro<TC, 'E', E, any>,
          unknown
        >
      >
    ],
    N extends string = HKT.Initial<TC, 'N'>,
    K = HKT.Initial<TC, 'K'>,
    Q = HKT.Initial<TC, 'Q'>,
    W = HKT.Initial<TC, 'W'>,
    X = HKT.Initial<TC, 'X'>,
    I = HKT.Initial<TC, 'I'>,
    S = HKT.Initial<TC, 'S'>,
    R = HKT.Initial<TC, 'R'>,
    E = HKT.Initial<TC, 'E'>
  >(
    ...t: KT
  ): HKT.Kind<
    F,
    TC,
    InferMixTuple<F, TC, 'N', N, KT>,
    InferMixTuple<F, TC, 'K', K, KT>,
    InferMixTuple<F, TC, 'Q', Q, KT>,
    InferMixTuple<F, TC, 'W', W, KT>,
    InferMixTuple<F, TC, 'X', X, KT>,
    InferMixTuple<F, TC, 'I', I, KT>,
    InferMixTuple<F, TC, 'S', S, KT>,
    InferMixTuple<F, TC, 'R', R, KT>,
    InferMixTuple<F, TC, 'E', E, KT>,
    {
      [K in keyof KT]: HKT.Infer<F, TC, 'A', KT[K]>
    }
  >
}

export function sequenceTF<F extends HKT.URIS, C = HKT.Auto>(F: Apply<F, C>): SequenceTFn<F, C>
export function sequenceTF<F>(F: Apply<HKT.UHKT<F>>): SequenceTFn<HKT.UHKT<F>> {
  return (...t) => {
    const len = t.length
    const f   = getTupleConstructor(len)
    let fas   = F.map_(t[0], f)
    for (let i = 1; i < len; i++) {
      fas = F.ap_(fas, t[i]) as any
    }
    return fas as any
  }
}

/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

/**
 * @internal
 */
function curried(f: Function, n: number, acc: ReadonlyArray<unknown>) {
  return function (x: unknown) {
    const combined = Array(acc.length + 1)
    for (let i = 0; i < acc.length; i++) {
      // eslint-disable-next-line functional/immutable-data
      combined[i] = acc[i]
    }
    // eslint-disable-next-line functional/immutable-data
    combined[acc.length] = x
    /* eslint-disable-next-line prefer-spread */
    return n === 0 ? f.apply(null, combined) : curried(f, n - 1, combined)
  }
}
/**
 * @internal
 */
const tupleConstructors: Record<number, (a: unknown) => any> = {
  1: (a) => [a],
  2: (a) => (b: any) => [a, b],
  3: (a) => (b: any) => (c: any) => [a, b, c],
  4: (a) => (b: any) => (c: any) => (d: any) => [a, b, c, d],
  5: (a) => (b: any) => (c: any) => (d: any) => (e: any) => [a, b, c, d, e]
}

/**
 * @internal
 */
function getTupleConstructor(len: number): (a: unknown) => any {
  /* eslint-disable-next-line no-prototype-builtins */
  if (!tupleConstructors.hasOwnProperty(len)) {
    // eslint-disable-next-line functional/immutable-data
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]
}

/**
 * @internal
 */
type InferMixStruct<F extends HKT.URIS, TC, P extends HKT.Param, T, KS> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KS]: HKT.Infer<F, TC, P, KS[K]> }
>

/**
 * @internal
 */
type InferMixTuple<F extends HKT.URIS, TC, P extends HKT.Param, T, KT> = HKT.MixStruct<
  TC,
  P,
  T,
  { [K in keyof KT & number]: HKT.Infer<F, TC, P, KT[K]> }
>
