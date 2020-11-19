import * as Eq from "@principia/core/Eq";
import type { FunctionN } from "@principia/prelude/Function";
import type { Functor } from "@principia/prelude/Functor";
import type * as HKT from "@principia/prelude/HKT";
import * as fc from "fast-check";

export const FunctorLaws = {
  identity: <F, A>(F: Functor<HKT.UHKT<F>>, S: Eq.Eq<HKT.HKT<F, A>>) => (
    fa: HKT.HKT<F, A>
  ): boolean => {
    return S.equals_(
      F.map_(fa, (a) => a),
      fa
    );
  },
  composition: <F extends HKT.URIS, TC, A, B, C>(
    F: Functor<F, TC>,
    S: Eq.Eq<
      HKT.Kind<
        F,
        TC,
        HKT.Initial<TC, "N">,
        HKT.Initial<TC, "K">,
        HKT.Initial<TC, "Q">,
        HKT.Initial<TC, "W">,
        HKT.Initial<TC, "X">,
        HKT.Initial<TC, "I">,
        HKT.Initial<TC, "S">,
        HKT.Initial<TC, "R">,
        HKT.Initial<TC, "E">,
        C
      >
    >,
    ab: FunctionN<[A], B>,
    bc: FunctionN<[B], C>
  ) => (
    fa: HKT.Kind<
      F,
      TC,
      HKT.Initial<TC, "N">,
      HKT.Initial<TC, "K">,
      HKT.Initial<TC, "Q">,
      HKT.Initial<TC, "W">,
      HKT.Initial<TC, "X">,
      HKT.Initial<TC, "I">,
      HKT.Initial<TC, "S">,
      HKT.Initial<TC, "R">,
      HKT.Initial<TC, "E">,
      A
    >
  ): boolean => {
    return S.equals_(
      F.map_(fa, (a) => bc(ab(a))),
      F.map_(F.map_(fa, ab), bc)
    );
  }
};

export function testFunctorComposition<F extends HKT.URIS, C>(
  F: Functor<F, C>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
    HKT.Kind<
      F,
      C,
      HKT.Initial<C, "N">,
      HKT.Initial<C, "K">,
      HKT.Initial<C, "Q">,
      HKT.Initial<C, "W">,
      HKT.Initial<C, "X">,
      HKT.Initial<C, "I">,
      HKT.Initial<C, "S">,
      HKT.Initial<C, "R">,
      HKT.Initial<C, "E">,
      A
    >
  >,
  liftEq: <A>(
    Sa: Eq.Eq<A>
  ) => Eq.Eq<
    HKT.Kind<
      F,
      C,
      HKT.Initial<C, "N">,
      HKT.Initial<C, "K">,
      HKT.Initial<C, "Q">,
      HKT.Initial<C, "W">,
      HKT.Initial<C, "X">,
      HKT.Initial<C, "I">,
      HKT.Initial<C, "S">,
      HKT.Initial<C, "R">,
      HKT.Initial<C, "E">,
      A
    >
  >
) => void {
  return (lift, liftEq) => {
    const arb = lift(fc.string());
    const Sc = liftEq(Eq.number);
    const ab = (s: string): number | null | undefined =>
      s.length === 1 ? undefined : s.length === 2 ? null : s.length;
    const bc = (n: number | null | undefined): number =>
      n === undefined ? 1 : n === null ? 2 : n * 2;

    const composition = fc.property(arb, FunctorLaws.composition(F, Sc, ab, bc));

    fc.assert(composition, { seed: -525356605, path: "26:2:2", endOnFailure: true, verbose: true });
  };
}
