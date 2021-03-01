import type { Erase } from '../util/types'
import type { Alt, AltFn_ } from './Alt'
import type { MonadExcept } from './MonadExcept'
import type { Monoidal } from './Monoidal'
import type { Semigroup } from './Semigroup'
import type { CrossWithFn_ } from './Semimonoidal'

import * as E from '../Either'
import * as HKT from '../HKT'
import { flattenF } from './Bind'
import { attemptF } from './MonoidalExcept'

export function getApplicativeValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C>
): <E>(S: Semigroup<E>) => Monoidal<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getApplicativeValidation<F>(
  F: MonadExcept<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Monoidal<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
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

    return HKT.instance<Monoidal<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      map_: F.map_,
      map: F.map,
      crossWith_,
      crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
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
    return HKT.instance<Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      map_: F.map_,
      map: F.map,
      alt_,
      alt: (that) => (fa) => alt_(fa, that)
    })
  }
}
