import type { Applicative } from '../Applicative'
import type { CrossWithFn_ } from '../Apply'
import type * as HKT from '../HKT'
import type { Semigroup } from '../Semigroup'
import type { Alt, AltFn_, MonadExcept } from '../typeclass'
import type { Erase } from '../util/types'

import * as E from '../Either'
import * as P from '../typeclass'

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

    return P.getApplicative<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      pure: F.pure,
      crossWith_
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
    return P.getAlt<HKT.UHKT2<F>, HKT.Fix<'E', E>>({
      map_: F.map_,
      alt_
    })
  }
}
