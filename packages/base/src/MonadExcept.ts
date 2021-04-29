import type { ApplicativeExceptMin } from './ApplicativeExcept'
import type { Either } from './internal/Either'
import type { MonadMin } from './Monad'

import { pureF } from './Applicative'
import { ApplicativeExcept } from './ApplicativeExcept'
import { bindF_ } from './Bind'
import * as HKT from './HKT'
import * as E from './internal/Either'
import { Monad } from './Monad'

export interface MonadExcept<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, ApplicativeExcept<F, C> {
  readonly refail: RefailFn<F, C>
}

export type MonadExceptMin<F extends HKT.URIS, C = HKT.Auto> = MonadMin<F, C> & ApplicativeExceptMin<F, C>

export function MonadExcept<F extends HKT.URIS, C = HKT.Auto>(F: MonadExceptMin<F, C>): MonadExcept<F, C> {
  const MonadF             = Monad(F)
  const ApplicativeExceptF = ApplicativeExcept(F)
  return HKT.instance<MonadExcept<F, C>>({
    ...MonadF,
    ...ApplicativeExceptF,
    refail: MonadF.bind(E.match(ApplicativeExceptF.fail, ApplicativeExceptF.pure))
  })
}

export interface RefailFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<HKT.OrFix<'E', C, E1>, A>>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, 'E', [E, E1]>, A>
}

export function refailF<F extends HKT.URIS, C = HKT.Auto>(F: MonadExceptMin<F, C>): RefailFn<F, C> {
  const bind_ = bindF_(F)
  const pure  = pureF(F)
  return (fa) => bind_(fa, E.match(F.fail, pure))
}
