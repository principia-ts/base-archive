import type { URI, V } from './core'
import type * as P from '@principia/base/typeclass'

import * as HKT from '@principia/base/HKT'
import { getOptionT } from '@principia/base/OptionT'
import { mapNF, sequenceSF } from '@principia/base/typeclass'

import { apPar, apPar_, crossPar, crossPar_, crossWithPar, crossWithPar_ } from './combinators'
import {
  absolve,
  ap,
  ap_,
  attempt,
  bind,
  bind_,
  catchAll,
  catchAll_,
  catchSome,
  catchSome_,
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

export const Functor = HKT.instance<P.Functor<[URI], V>>({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_,
  ap,
  crossWith_,
  crossWith,
  cross_,
  cross
})

export const ApplyPar = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_: apPar_,
  ap: apPar,
  crossWith_: crossWithPar_,
  crossWith: crossWithPar,
  cross_: crossPar_,
  cross: crossPar
})

export const mapN         = mapNF(Apply)
export const mapNPar      = mapNF(ApplyPar)
export const sequenceS    = sequenceSF(Apply)
export const sequenceSPar = sequenceSF(ApplyPar)

export const Applicative = HKT.instance<P.Applicative<[URI], V>>({
  ...Apply,
  pure,
  unit
})

export const ApplicativePar = HKT.instance<P.Applicative<[URI], V>>({
  ...ApplyPar,
  pure,
  unit
})

export const Monad = HKT.instance<P.Monad<[URI], V>>({
  ...Applicative,
  bind_,
  bind,
  flatten
})

export const MonadExcept = HKT.instance<P.MonadExcept<[URI], V>>({
  ...Monad,
  catchAll_,
  catchAll,
  catchSome_,
  catchSome,
  attempt: attempt,
  absolve,
  fail
})

export const IOOption = getOptionT(Monad)
