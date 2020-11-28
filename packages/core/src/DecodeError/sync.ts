import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type * as D from "../Decoder";
import * as FS from "../FreeSemigroup";
import * as Sy from "../Sync";
import type { DecodeErrors } from "./default";

function zip_<R, A, R1, B>(
  fa: Sy.Sync<R, DecodeErrors, A>,
  fb: Sy.Sync<R1, DecodeErrors, B>
): Sy.Sync<R & R1, DecodeErrors, readonly [A, B]> {
  return Sy.foldTogetherM_(
    fa,
    fb,
    (e, e1) => Sy.fail(FS.combine(e, e1)),
    (_, e1) => Sy.fail(e1),
    (_, e) => Sy.fail(e),
    (a, b) => Sy.succeed([a, b])
  );
}

function alt_<R, A, R1>(
  me: Sy.Sync<R, DecodeErrors, A>,
  that: () => Sy.Sync<R1, DecodeErrors, A>
): Sy.Sync<R & R1, DecodeErrors, A> {
  return Sy.foldM_(
    me,
    (e) => Sy.foldM_(that(), (e1) => Sy.fail(FS.combine(e, e1)), Sy.succeed),
    Sy.succeed
  );
}

export const SyncDecoderF: P.MonadFail<[Sy.URI], D.V<Sy.V>> &
  P.Applicative<[Sy.URI], D.V<Sy.V>> &
  P.Bifunctor<[Sy.URI], Sy.V> &
  P.Alt<[Sy.URI], D.V<Sy.V>> = HKT.instance({
  ...Sy.MonadFail,
  ...Sy.Bifunctor,
  zip_,
  zip: <R1, B>(fb: Sy.Sync<R1, DecodeErrors, B>) => <R, A>(fa: Sy.Sync<R, DecodeErrors, A>) =>
    zip_(fa, fb),
  alt_,
  alt: <R1, A>(that: () => Sy.Sync<R1, DecodeErrors, A>) => <R>(me: Sy.Sync<R, DecodeErrors, A>) =>
    alt_(me, that)
});
