import type { IOURI } from '../Modules'
import type { V } from './core'
import type * as P from '@principia/base/typeclass'

import * as HKT from '@principia/base/HKT'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { apPar, apPar_, crossWithPar, crossWithPar_ } from './combinators'
import { ap, ap_, bind, bind_, catchAll, catchAll_, crossWith, crossWith_, fail, map, map_, pure, unit } from './core'

export const Functor: P.Functor<[HKT.URI<IOURI>], V> = HKT.instance({
  map_,
  map
})

export const SemimonoidalFunctor = HKT.instance<P.SemimonoidalFunctor<[HKT.URI<IOURI>], V>>({
  ...Functor,
  crossWith_,
  crossWith
})

export const SemimonoidalFunctorPar = HKT.instance<P.SemimonoidalFunctor<[HKT.URI<IOURI>], V>>({
  ...Functor,
  crossWith_: crossWithPar_,
  crossWith: crossWithPar
})

export const mapN    = mapNF(SemimonoidalFunctor)
export const mapNPar = mapNF(SemimonoidalFunctorPar)

export const sequenceS    = sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = sequenceSF(SemimonoidalFunctorPar)

export const Apply = HKT.instance<P.Apply<[HKT.URI<IOURI>], V>>({
  ...SemimonoidalFunctor,
  ap_,
  ap
})

export const ApplyPar = HKT.instance<P.Apply<[HKT.URI<IOURI>], V>>({
  ...SemimonoidalFunctorPar,
  ap_: apPar_,
  ap: apPar
})

export const MonoidalFunctor = HKT.instance<P.MonoidalFunctor<[HKT.URI<IOURI>], V>>({
  ...SemimonoidalFunctor,
  unit
})

export const MonoidalFunctorPar = HKT.instance<P.MonoidalFunctor<[HKT.URI<IOURI>], V>>({
  ...SemimonoidalFunctorPar,
  unit
})

export const Applicative = HKT.instance<P.Applicative<[HKT.URI<IOURI>], V>>({
  ...Apply,
  unit,
  pure
})

export const ApplicativePar = HKT.instance<P.Applicative<[HKT.URI<IOURI>], V>>({
  ...ApplyPar,
  unit,
  pure
})

export const Monad = HKT.instance<P.Monad<[HKT.URI<IOURI>], V>>({
  ...Applicative,
  bind_,
  bind
})

export const MonadExcept = HKT.instance<P.MonadExcept<[HKT.URI<IOURI>], V>>({
  ...Monad,
  catchAll_,
  catchAll,
  fail
})
