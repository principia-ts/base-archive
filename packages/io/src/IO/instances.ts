import type { URI, V } from './core'
import type * as P from '@principia/base/typeclass'

import * as HKT from '@principia/base/HKT'
import { getOptionT } from '@principia/base/OptionT'
import { mapNF, sequenceSF, sequenceTF } from '@principia/base/typeclass'

import { apPar, apPar_, map2Par, map2Par_, productPar, productPar_ } from './combinators'
import { ap, ap_, flatMap, flatMap_, flatten, map, map_, map2, map2_, product, product_, pure, unit } from './core'

export const Functor = HKT.instance<P.Functor<[URI], V>>({
  imap_: (fa, f, _) => map_(fa, f),
  imap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
})

export const ApplyPar = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_: apPar_,
  ap: apPar,
  map2_: map2Par_,
  map2: map2Par,
  product_: productPar_,
  product: productPar
})

export const mapN         = mapNF(Apply)
export const mapNPar      = mapNF(ApplyPar)
export const sequenceT    = sequenceTF(Apply)
export const sequenceTPar = sequenceTF(ApplyPar)
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
  flatMap_,
  flatMap,
  flatten
})

export const IOOption = getOptionT(Monad)
