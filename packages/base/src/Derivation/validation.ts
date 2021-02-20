import type { Applicative } from '../Applicative'
import type { CrossWithFn_ } from '../Apply'
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
    const crossWith_: CrossWithFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, fb, f) =>
      F.flatten(
        F.map_(F.cross_(F.attempt(fa), F.attempt(fb)), ([ea, eb]) =>
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

    return HKT.instance<Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      invmap_: F.invmap_,
      invmap: F.invmap,
      map_: F.map_,
      map: F.map,
      unit: F.unit,
      pure: F.pure,
      crossWith_,
      crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
      ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
      ap: (fa) => (fab) => crossWith_(fab, fa, (f, a) => f(a)),
      cross_: (fa, fb) => crossWith_(fa, fb, tuple),
      cross: (fb) => (fa) => crossWith_(fa, fb, tuple)
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
        E.match(
          (e) =>
            F.bind_(
              F.attempt(that()),
              E.match(
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
