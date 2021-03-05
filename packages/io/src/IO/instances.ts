import type { IOURI } from '../Modules'
import type { V } from './core'
import type * as HKT from '@principia/base/HKT'

import * as P from '@principia/base/typeclass'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { apPar, apPar_, crossPar_, crossWithPar, crossWithPar_ } from './combinators'
import {
  ap,
  ap_,
  bind,
  bind_,
  catchAll,
  catchAll_,
  cross_,
  crossWith,
  crossWith_,
  fail,
  flatten,
  map,
  map_,
  pure,
  unit
} from './core'

export const Functor: P.Functor<[HKT.URI<IOURI>], V> = P.Functor({
  map_
})

export const SemimonoidalFunctor: P.SemimonoidalFunctor<[HKT.URI<IOURI>], V> = P.SemimonoidalFunctor({
  map_,
  crossWith_,
  cross_
})

export const SemimonoidalFunctorPar: P.SemimonoidalFunctor<[HKT.URI<IOURI>], V> = P.SemimonoidalFunctor({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_
})

export const mapN    = mapNF(SemimonoidalFunctor)
export const mapNPar = mapNF(SemimonoidalFunctorPar)

export const sequenceS    = sequenceSF(SemimonoidalFunctor)
export const sequenceSPar = sequenceSF(SemimonoidalFunctorPar)

export const Apply: P.Apply<[HKT.URI<IOURI>], V> = P.Apply({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const ApplyPar: P.Apply<[HKT.URI<IOURI>], V> = P.Apply({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  ap_: apPar_
})

export const MonoidalFunctor: P.MonoidalFunctor<[HKT.URI<IOURI>], V> = P.MonoidalFunctor({
  map_,
  crossWith_,
  cross_,
  unit
})

export const MonoidalFunctorPar: P.MonoidalFunctor<[HKT.URI<IOURI>], V> = P.MonoidalFunctor({
  map_,
  crossWith_: crossWithPar_,
  cross_: crossPar_,
  unit
})

export const Applicative: P.Applicative<[HKT.URI<IOURI>], V> = P.Applicative({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const ApplicativePar: P.Applicative<[HKT.URI<IOURI>], V> = P.Applicative({
  map_,
  cross_: crossPar_,
  crossWith_: crossWithPar_,
  ap_: apPar_,
  unit,
  pure
})

export const Monad: P.Monad<[HKT.URI<IOURI>], V> = P.Monad({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten
})

export const MonadExcept: P.MonadExcept<[HKT.URI<IOURI>], V> = P.MonadExcept({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  catchAll_,
  fail
})
