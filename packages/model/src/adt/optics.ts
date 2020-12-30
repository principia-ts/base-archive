import * as Lens from '@principia/optics/Lens'
import * as Optional from '@principia/optics/Optional'
import * as Prism from '@principia/optics/Prism'

export interface OpticsFor<S> {
  lens: Lens.Lens<S, S>
  prism: Prism.Prism<S, S>
  optional: Optional.Optional<S, S>
}

const makeOpticsFor = <S>(): OpticsFor<S> => ({
  lens: Lens.id(),
  prism: Prism.id(),
  optional: Optional.id()
})

const staticOptics = makeOpticsFor<any>()

export const OpticsFor = <A>(): OpticsFor<A> => staticOptics
