import type { ApplicativeExcept, ApplicativeExceptMin } from './ApplicativeExcept'
import type { Either } from './Either'
import type { Monad, MonadMin } from './Monad'

import { getApplicativeExcept } from './ApplicativeExcept'
import * as HKT from './HKT'
import { getMonad } from './Monad'

export interface MonadExcept<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, ApplicativeExcept<F, C> {
  readonly absolve: AbsolveFn<F, C>
}

export function getMonadExcept<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadMin<F, C> & ApplicativeExceptMin<F, C>
): MonadExcept<F, C> {
  return HKT.instance<MonadExcept<F, C>>({
    ...getMonad(F),
    ...getApplicativeExcept(F),
    absolve: (fa) =>
      F.bind_(fa, (ea) => {
        switch (ea._tag) {
          case 'Left':
            return F.fail(ea.left)
          case 'Right':
            return F.pure(ea.right)
        }
      })
  })
}

export interface AbsolveFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<HKT.OrFix<'E', C, E1>, A>>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, 'E', [E, E1]>, A>
}
