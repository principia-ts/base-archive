import type * as HKT from '@principia/base/HKT'
import type * as P from '@principia/base/typeclass'

export type MonadDecoder<M extends HKT.URIS, C> = P.MonadExcept<M, C> & P.Bifunctor<M, C> & P.Alt<M, C>
