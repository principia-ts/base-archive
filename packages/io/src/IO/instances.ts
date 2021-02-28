import type { IOURI } from '../Modules'
import type { V } from './core'
import type * as P from '@principia/base/typeclass'

import * as HKT from '@principia/base/HKT'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { apPar, apPar_, crossPar, crossPar_, crossWithPar, crossWithPar_ } from './combinators'
import {
  ap,
  ap_,
  bind,
  bind_,
  catchAll,
  catchAll_,
  cross,
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

export const Functor: P.Functor<[HKT.URI<IOURI>], V> = HKT.instance({
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[HKT.URI<IOURI>], V>>({
  ...Functor,
  ap_,
  ap,
  crossWith_,
  crossWith,
  cross_,
  cross
})

export const ApplyPar = HKT.instance<P.Apply<[HKT.URI<IOURI>], V>>({
  ...Functor,
  ap_: apPar_,
  ap: apPar,
  crossWith_: crossWithPar_,
  crossWith: crossWithPar,
  cross_: crossPar_,
  cross: crossPar
})

export const mapN    = mapNF(Apply)
export const mapNPar = mapNF(ApplyPar)

export const sequenceS    = sequenceSF(Apply)
export const sequenceSPar = sequenceSF(ApplyPar)

export const Applicative = HKT.instance<P.Applicative<[HKT.URI<IOURI>], V>>({
  ...Apply,
  pure,
  unit
})

export const ApplicativePar = HKT.instance<P.Applicative<[HKT.URI<IOURI>], V>>({
  ...ApplyPar,
  pure,
  unit
})

export const Monad = HKT.instance<P.Monad<[HKT.URI<IOURI>], V>>({
  ...Applicative,
  bind_,
  bind,
  flatten
})

export const MonadExcept = HKT.instance<P.MonadExcept<[HKT.URI<IOURI>], V>>({
  ...Monad,
  catchAll_,
  catchAll,
  fail
})
