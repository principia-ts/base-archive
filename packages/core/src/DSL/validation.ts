import type { Alt, AltFn_ } from "@principia/prelude";
import { chainF_, pureF, tuple } from "@principia/prelude";
import type { Applicative, ZipFn_ } from "@principia/prelude/Applicative";
import type { Fallible } from "@principia/prelude/Fallible";
import * as HKT from "@principia/prelude/HKT";
import type { Monad } from "@principia/prelude/Monad";
import type { Semigroup } from "@principia/prelude/Semigroup";
import type { Erase } from "@principia/prelude/Utils";

import * as E from "../Either";

export function getApplicativeValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C> & Applicative<F, C>
): <E>(S: Semigroup<E>) => Applicative<F, Erase<HKT.Strip<C, "E">, HKT.Auto> & HKT.Fix<"E", E>>;
export function getApplicativeValidationF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>> & Applicative<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Applicative<HKT.UHKT2<F>, HKT.Fix<"E", E>> {
  return <E>(S: Semigroup<E>) => {
    const zip_: ZipFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, fb) =>
      F.flatten(
        F.map_(F.zip_(F.recover(fa), F.recover(fb)), ([ea, eb]) =>
          E.fold_(
            ea,
            (e) =>
              E.fold_(
                eb,
                (e1) => F.fail(S.combine_(e, e1)),
                () => F.fail(e)
              ),
            (a) => E.fold_(eb, F.fail, (b) => pureF(F)(tuple(a, b)))
          )
        )
      );

    return HKT.instance<Applicative<HKT.UHKT2<F>, HKT.Fix<"E", E>>>({
      unit: F.unit,
      map: F.map,
      map_: F.map_,
      zip_,
      zip: (fb) => (fa) => zip_(fa, fb)
    });
  };
}

export function getAltValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C> & Alt<F, C>
): <E>(S: Semigroup<E>) => Alt<F, Erase<HKT.Strip<C, "E">, HKT.Auto> & HKT.Fix<"E", E>>;
export function getAltValidationF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>> & Alt<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>> {
  return <E>(S: Semigroup<E>) => {
    const pure = pureF(F);
    const chain_ = chainF_(F);
    const alt_: AltFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, that) =>
      chain_(
        F.recover(fa),
        E.fold(
          (e) =>
            chain_(
              F.recover(that()),
              E.fold(
                (e1) => F.fail(S.combine_(e, e1)),
                (a) => pure(a)
              )
            ),
          (a) => pure(a)
        )
      );
    return HKT.instance<Alt<HKT.UHKT2<F>, HKT.Fix<"E", E>>>({
      map: F.map,
      map_: F.map_,
      alt_,
      alt: (that) => (fa) => alt_(fa, that)
    });
  };
}
