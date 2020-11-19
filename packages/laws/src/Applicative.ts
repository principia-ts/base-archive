import * as Eq from "@principia/core/Eq";
import { pureF } from "@principia/prelude";
import type { Applicative } from "@principia/prelude/Applicative";
import { compose_, tuple, tupleFlip, tupleUnit } from "@principia/prelude/Equivalence";
import type * as HKT from "@principia/prelude/HKT";
import * as fc from "fast-check";

export function ApplicativeAssociativity<F extends HKT.URIS, TC, A, B, C>(
  F: Applicative<F, TC>,
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
      readonly [readonly [A, B], C]
    >
  >
): <
  NA extends string,
  KA,
  QA,
  WA,
  XA,
  IA,
  SA,
  RA,
  EA,
  A,
  NB extends string,
  KB,
  QB,
  WB,
  XB,
  IB,
  SB,
  RB,
  EB,
  B,
  NC extends string,
  KC,
  QC,
  WC,
  XC,
  IC,
  SC,
  RC,
  EC,
  C
>(
  fa: HKT.Kind<F, TC, NA, KA, QA, WA, XA, IA, SA, RA, EA, A>,
  fb: HKT.Kind<F, TC, NB, KB, QB, WB, XB, IB, SB, RB, EB, B>,
  fc: HKT.Kind<F, TC, NC, KC, QC, WC, XC, IC, SC, RC, EC, C>
) => boolean;
export function ApplicativeAssociativity<F, A, B, C>(
  F: Applicative<HKT.UHKT<F>>,
  S: Eq.Eq<HKT.HKT<F, readonly [readonly [A, B], C]>>
): (fa: HKT.HKT<F, A>, fb: HKT.HKT<F, B>, fc: HKT.HKT<F, C>) => boolean {
  const equiv = tuple<A, B, C>();
  return (fa, fb, fc) => {
    const left = F.both_(fa, F.both_(fb, fc));
    const right = F.both_(F.both_(fa, fb), fc);
    const left2 = F.map_(left, equiv.to);
    return S.equals_(left2, right);
  };
}

export function testApplicativeAssociativity<F extends HKT.URIS, TC>(
  F: Applicative<F, TC>
): (
  lift: <A>(
    a: fc.Arbitrary<A>
  ) => fc.Arbitrary<
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
      A
    >
  >,
  liftEqs: <A, B, C>(
    Sa: Eq.Eq<A>,
    Sb: Eq.Eq<B>,
    Sc: Eq.Eq<C>
  ) => Eq.Eq<
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
      readonly [readonly [A, B], C]
    >
  >
) => void {
  return (lift, liftEqs) => {
    const arbString = lift(fc.string());
    const arbNumber = lift(fc.double());
    const Sabc = liftEqs(Eq.string, Eq.number, Eq.number);

    const associativity = fc.property(fc.tuple(arbString, arbNumber, arbNumber), ([fa, fb, fc]) =>
      ApplicativeAssociativity(F, Sabc)(fa, fb, fc)
    );

    fc.assert(associativity, {
      seed: -525356605,
      path: "26:2:2",
      endOnFailure: true,
      verbose: true
    });
  };
}

export const ApplicativeLaws = {
  associativeComposition: <F, A, B, C>(
    F: Applicative<HKT.UHKT<F>>,
    S: Eq.Eq<HKT.HKT<F, readonly [readonly [A, B], C]>>
  ) => (fa: HKT.HKT<F, A>, fb: HKT.HKT<F, B>, fc: HKT.HKT<F, C>): boolean => {
    const equiv = tuple<A, B, C>();
    const left = F.both_(fa, F.both_(fb, fc));
    const right = F.both_(F.both_(fa, fb), fc);
    const left2 = F.map_(left, equiv.to);
    return S.equals_(left2, right);
  },
  leftIdentity: <F, A>(F: Applicative<HKT.UHKT<F>>, S: Eq.Eq<HKT.HKT<F, A>>) => (
    fa: HKT.HKT<F, A>
  ): boolean => {
    const equiv = compose_(tupleFlip<void, A>(), tupleUnit());
    const left = F.both_(F.unit(), fa);
    const right = fa;
    const left2 = F.map_(left, equiv.to);
    return S.equals_(left2, right);
  },
  rightIdentity: <F, A>(F: Applicative<HKT.UHKT<F>>, S: Eq.Eq<HKT.HKT<F, A>>) => (
    fa: HKT.HKT<F, A>
  ): boolean => {
    const equiv = tupleUnit<A>();
    const left = F.both_(fa, F.unit());
    const right = fa;
    const left2 = F.map_(left, equiv.to);
    return S.equals_(left2, right);
  }
};
