import type { Alt, AltFn_ } from "@principia/prelude";
import { chainF, pureF, tuple } from "@principia/prelude";
import type { Applicative, BothFn_ } from "@principia/prelude/Applicative";
import type { Fallible } from "@principia/prelude/Fallible";
import * as HKT from "@principia/prelude/HKT";
import type { Monad } from "@principia/prelude/Monad";
import type { Semigroup } from "@principia/prelude/Semigroup";
import type { Erase } from "@principia/prelude/Utils";

import * as E from "../Either";
import { pipe } from "../Function";

export function getApplicativeValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C> & Applicative<F, C>
): <E>(S: Semigroup<E>) => Applicative<F, Erase<HKT.Strip<C, "E">, HKT.Auto> & HKT.Fix<"E", E>>;
export function getApplicativeValidationF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>> & Applicative<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Applicative<HKT.UHKT2<F>, HKT.Fix<"E", E>> {
  return <E>(S: Semigroup<E>) => {
    const both_: BothFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, fb) =>
      pipe(
        F.recover(fa),
        F.both(F.recover(fb)),
        F.map(([ea, eb]) =>
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
        ),
        F.flatten
      );

    return HKT.instance<Applicative<HKT.UHKT2<F>, HKT.Fix<"E", E>>>({
      unit: F.unit,
      map: F.map,
      map_: F.map_,
      both_,
      both: (fb) => (fa) => both_(fa, fb)
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
    const chain = chainF(F);
    const alt_: AltFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, that) =>
      pipe(
        F.recover(fa),
        chain(
          E.fold(
            (e) =>
              pipe(
                F.recover(that()),
                chain(
                  E.fold(
                    (e1) => F.fail(S.combine_(e, e1)),
                    (a) => pure(a)
                  )
                )
              ),
            (a) => pure(a)
          )
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
