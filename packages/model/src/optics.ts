import * as L from "@principia/optics/Lens";
import * as O from "@principia/optics/Optional";
import * as P from "@principia/optics/Prism";

export interface OpticsFor<S> {
   readonly lens: L.Lens<S, S>;
   readonly prism: P.Prism<S, S>;
   readonly optional: O.Optional<S, S>;
}

const makeOpticsFor = <S>(): OpticsFor<S> => ({
   lens: L.id(),
   prism: P.id(),
   optional: O.id()
});

const staticOptics = makeOpticsFor<any>();

export const OpticsFor = <A>(): OpticsFor<A> => staticOptics;
