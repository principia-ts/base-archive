import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'

export type V<C, E> = HKT.CleanParam<C, 'E'> & HKT.Fix<'E', E>

export type MonadDecoder<M extends HKT.URIS, C, E> = P.Monad<M, V<C, E>> &
  P.Fail<M, V<C, E>> &
  P.Bifunctor<M, V<C, E>> &
  P.Alt<M, V<C, E>>
