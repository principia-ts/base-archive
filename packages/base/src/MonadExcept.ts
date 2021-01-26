import type { ApplicativeExcept } from './ApplicativeExcept'
import type { Either } from './Either'
import type { Fail } from './Fail'
import type * as HKT from './HKT'
import type { Monad } from './Monad'

export interface MonadExcept<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C>, ApplicativeExcept<F, C> {
  readonly absolve: AbsolveFn<F, C>
}

export interface AbsolveFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, E1, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, Either<HKT.OrFix<'E', C, E1>, A>>
  ): HKT.Kind<F, C, N, K, Q, W, X, I, S, R, HKT.Mix<C, 'E', [E, E1]>, A>
}
