import type { AltFn_ } from './Alt'
import type * as HKT from './HKT'
import type { MonadExcept } from './MonadExcept'
import type { Semigroup } from './Semigroup'
import type { CrossWithFn_ } from './SemimonoidalFunctor'
import type { Erase } from './util/types'

import { Alt } from './Alt'
import { Applicative } from './Applicative'
import { attemptF } from './ApplicativeExcept'
import { flattenF } from './Bind'
import * as E from './Either'

export function getApplicativeValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C>
): <E>(S: Semigroup<E>) => Applicative<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getApplicativeValidation<F>(
  F: MonadExcept<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  const attempt = attemptF(F)
  return <E>(S: Semigroup<E>) => {
    const crossWith_: CrossWithFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, fb, f) =>
      flattenF(F)(
        F.crossWith_(attempt(fa), attempt(fb), (ea, eb) =>
          E.match_(
            ea,
            (e) =>
              E.match_(
                eb,
                (e1) => F.fail(S.combine_(e, e1)),
                () => F.fail(e)
              ),
            (a) => E.match_(eb, F.fail, (b) => F.pure(f(a, b)))
          )
        )
      )

    return Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      crossWith_,
      pure: F.pure
    })
  }
}

export function getAltValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C> & Alt<F, C>
): <E>(S: Semigroup<E>) => Alt<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getAltValidation<F>(
  F: MonadExcept<HKT.UHKT2<F>> & Alt<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  const attempt = attemptF(F)
  return <E>(S: Semigroup<E>) => {
    const alt_: AltFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, that) =>
      F.bind_(
        attempt(fa),
        E.match(
          (e) =>
            F.bind_(
              attempt(that()),
              E.match(
                (e1) => F.fail(S.combine_(e, e1)),
                (a) => F.pure(a)
              )
            ),
          (a) => F.pure(a)
        )
      )
    return Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      alt_
    })
  }
}
