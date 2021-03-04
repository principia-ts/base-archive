import type { ApplicativeExcept } from './ApplicativeExcept'
import type { Either } from './Either'
import type * as HKT from './HKT'
import type { Monad } from './Monad'

import * as E from './internal/either'

export interface MonadExcept<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, ApplicativeExcept<F, C> {}

export interface RefailFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<HKT.OrFix<'E', C, E1>, A>>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, 'E', [E, E1]>, A>
}

export function refailF<F extends HKT.URIS, C = HKT.Auto>(F: MonadExcept<F, C>): RefailFn<F, C> {
  return F.bind(E.match(F.fail, F.pure))
}
