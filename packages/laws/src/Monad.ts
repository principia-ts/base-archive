import type * as Eq from "@principia/base/data/Eq";
import type { MorphismN } from "@principia/base/data/Function";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";

function LeftIdentityLaw<M extends HKT.URIS, TC, A, N extends string, K, Q, W, X, I, S, R, E, B>(
  M: P.Monad<M, TC>,
  S: Eq.Eq<
    HKT.Kind<
      M,
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
      B
    >
  >,
  afb: (a: A) => HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, B>
): (a: A) => boolean;
function LeftIdentityLaw<M, A, B>(
  M: P.Monad<HKT.UHKT<M>>,
  S: Eq.Eq<HKT.HKT<M, B>>,
  afb: MorphismN<[A], HKT.HKT<M, B>>
): (a: A) => boolean {
  return (a) => {
    return S.equals_(
      M.flatten(
        M.map_(
          M.map_(M.unit(), () => a),
          afb
        )
      ),
      afb(a)
    );
  };
}

function RightIdentityLaw<M extends HKT.URIS, TC, N extends string, K, Q, W, X, I, S, R, E, A>(
  M: P.Monad<M, TC>,
  S: Eq.Eq<HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>>
): (a: HKT.Kind<M, TC, N, K, Q, W, X, I, S, R, E, A>) => boolean;
function RightIdentityLaw<M, A>(
  M: P.Monad<HKT.UHKT<M>>,
  S: Eq.Eq<HKT.HKT<M, A>>
): (fa: HKT.HKT<M, A>) => boolean {
  return (fa) => {
    return S.equals_(M.flatten(M.map_(fa, (a) => M.map_(M.unit(), () => a))), fa);
  };
}

export const Monad = {
  leftIdentity: LeftIdentityLaw,
  rightIdentity: RightIdentityLaw
  /*
   * derivedMap: <M, A, B>(M: Monad<HKT.UHKT<M>>, S: Eq<HKT.HKT<M, B>>, ab: FunctionN<[A], B>) => (
   *   fa: HKT.HKT<M, A>
   * ): boolean => {
   *   return S.equals_(M.map_(fa, ab), M.flatten(M.map_(fa, (a) => M.map_(M.unit(), () => ab(a)))));
   * },
   * derivedChain: <M, A, B>(
   *   M: Monad<HKT.UHKT<M>> & Chain<HKT.UHKT<M>>,
   *   S: Eq<HKT.HKT<M, B>>,
   *   afb: FunctionN<[A], HKT.HKT<M, B>>
   * ) => (fa: HKT.HKT<M, A>): boolean => {
   *   return S.equals_(M.chain_(fa, afb), M.flatten(M.map_(fa, afb)));
   * }
   */
};
