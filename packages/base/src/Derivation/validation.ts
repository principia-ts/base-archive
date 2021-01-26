import type { Applicative } from '../Applicative'
import type { Map2Fn_ } from '../Apply'
import type { Semigroup } from '../Semigroup'
import type { Alt, AltFn_, MonadExcept } from '../typeclass'
import type { Erase } from '../util/types'

import * as E from '../Either'
import { tuple } from '../Function'
import * as HKT from '../HKT'

export function getApplicativeValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C>
): <E>(S: Semigroup<E>) => Applicative<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getApplicativeValidation<F>(
  F: MonadExcept<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: Semigroup<E>) => {
    const map2_: Map2Fn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, fb, f) =>
      F.flatten(
        F.map_(F.product_(F.attempt(fa), F.attempt(fb)), ([ea, eb]) =>
          E.fold_(
            ea,
            (e) =>
              E.fold_(
                eb,
                (e1) => F.fail(S.combine_(e, e1)),
                () => F.fail(e)
              ),
            (a) => E.fold_(eb, F.fail, (b) => F.pure(f(a, b)))
          )
        )
      )

    return HKT.instance<Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      invmap_: F.invmap_,
      invmap: F.invmap,
      map_: F.map_,
      map: F.map,
      unit: F.unit,
      pure: F.pure,
      map2_,
      map2: (fb, f) => (fa) => map2_(fa, fb, f),
      ap_: (fab, fa) => map2_(fab, fa, (f, a) => f(a)),
      ap: (fa) => (fab) => map2_(fab, fa, (f, a) => f(a)),
      product_: (fa, fb) => map2_(fa, fb, tuple),
      product: (fb) => (fa) => map2_(fa, fb, tuple)
    })
  }
}

export function getAltValidation<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C> & Alt<F, C>
): <E>(S: Semigroup<E>) => Alt<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getAltValidation<F>(
  F: MonadExcept<HKT.UHKT2<F>> & Alt<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: Semigroup<E>) => {
    const alt_: AltFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, that) =>
      F.bind_(
        F.attempt(fa),
        E.fold(
          (e) =>
            F.bind_(
              F.attempt(that()),
              E.fold(
                (e1) => F.fail(S.combine_(e, e1)),
                (a) => F.pure(a)
              )
            ),
          (a) => F.pure(a)
        )
      )
    return HKT.instance<Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      invmap_: F.invmap_,
      invmap: F.invmap,
      map: F.map,
      map_: F.map_,
      alt_,
      alt: (that) => (fa) => alt_(fa, that)
    })
  }
}
