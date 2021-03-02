import type { IOURI } from '../Modules'
import type { V } from './core'
import type * as P from '@principia/base/typeclass'

import * as HKT from '@principia/base/HKT'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { crossWithPar, crossWithPar_ } from './combinators'
import { bind, bind_, catchAll, catchAll_, crossWith, crossWith_, fail, map, map_, pure } from './core'

export const Functor: P.Functor<[HKT.URI<IOURI>], V> = HKT.instance({
  map_,
  map
})

export const Semimonoidal = HKT.instance<P.Semimonoidal<[HKT.URI<IOURI>], V>>({
  ...Functor,
  crossWith_,
  crossWith
})

export const SemimonoidalPar = HKT.instance<P.Semimonoidal<[HKT.URI<IOURI>], V>>({
  ...Functor,
  crossWith_: crossWithPar_,
  crossWith: crossWithPar
})

export const mapN    = mapNF(Semimonoidal)
export const mapNPar = mapNF(SemimonoidalPar)

export const sequenceS    = sequenceSF(Semimonoidal)
export const sequenceSPar = sequenceSF(SemimonoidalPar)

export const Monoidal = HKT.instance<P.Monoidal<[HKT.URI<IOURI>], V>>({
  ...Semimonoidal,
  pure
})

export const MonoidalPar = HKT.instance<P.Monoidal<[HKT.URI<IOURI>], V>>({
  ...SemimonoidalPar,
  pure
})

export const Monad = HKT.instance<P.Monad<[HKT.URI<IOURI>], V>>({
  ...Monoidal,
  bind_,
  bind
})

export const MonadExcept = HKT.instance<P.MonadExcept<[HKT.URI<IOURI>], V>>({
  ...Monad,
  catchAll_,
  catchAll,
  fail
})
