import type { Applicative } from '../Applicative'
import type { Map2Fn_ } from '../Apply'
import type { Fallible } from '../Fallible'
import type { Monad } from '../Monad'
import type { Semigroup } from '../Semigroup'
import type { Alt, AltFn_ } from '../typeclass'
import type { Erase } from '../util/types'

import * as E from '../Either'
import { tuple } from '../Function'
import * as HKT from '../HKT'

export function getApplicativeValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C>
): <E>(S: Semigroup<E>) => Applicative<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getApplicativeValidationF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Applicative<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: Semigroup<E>) => {
    const map2_: Map2Fn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, fb, f) =>
      F.flatten(
        F.map_(F.product_(F.recover(fa), F.recover(fb)), ([ea, eb]) =>
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
      imap_: F.imap_,
      imap: F.imap,
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

export function getAltValidationF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C> & Alt<F, C>
): <E>(S: Semigroup<E>) => Alt<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getAltValidationF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>> & Alt<HKT.UHKT2<F>>
): <E>(S: Semigroup<E>) => Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(S: Semigroup<E>) => {
    const alt_: AltFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, that) =>
      F.chain_(
        F.recover(fa),
        E.fold(
          (e) =>
            F.chain_(
              F.recover(that()),
              E.fold(
                (e1) => F.fail(S.combine_(e, e1)),
                (a) => F.pure(a)
              )
            ),
          (a) => F.pure(a)
        )
      )
    return HKT.instance<Alt<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      imap_: F.imap_,
      imap: F.imap,
      map: F.map,
      map_: F.map_,
      alt_,
      alt: (that) => (fa) => alt_(fa, that)
    })
  }
}
