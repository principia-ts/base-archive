import { flow } from "../Function";
import type { Functor, FunctorComposition } from "../Functor";
import { getCovariantFunctorComposition } from "../Functor";
import type * as HKT from "../HKT";
import type { SequenceFn, SequenceFnComposition } from "./SequenceFn";
import type { TraverseFn, TraverseFn_, TraverseFnComposition, TraverseFnComposition_ } from "./TraverseFn";

export interface Traversable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly traverse_: TraverseFn_<F, C>;
   readonly traverse: TraverseFn<F, C>;
   readonly sequence: SequenceFn<F, C>;
}

export interface TraversableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
   extends FunctorComposition<F, G, CF, CG> {
   readonly traverse_: TraverseFnComposition_<F, G, CF, CG>;
   readonly traverse: TraverseFnComposition<F, G, CF, CG>;
   readonly sequence: SequenceFnComposition<F, G, CF, CG>;
}

export function getTraversableComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
   F: Traversable<F, CF>,
   G: Traversable<G, CG>
): TraversableComposition<F, G, CF, CG>;
export function getTraversableComposition<F, G>(
   F: Traversable<HKT.UHKT<F>>,
   G: Traversable<HKT.UHKT<G>>
): TraversableComposition<HKT.UHKT<F>, HKT.UHKT<G>> {
   const traverse_: TraverseFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (H) => (tfga, f) =>
      F.traverse_(H)(tfga, (tga) => G.traverse_(H)(tga, f));
   return {
      ...getCovariantFunctorComposition(F, G),
      traverse_,
      traverse: (H) => flow(G.traverse(H), F.traverse(H)),
      sequence: (H) => flow(F.map(G.sequence(H)), F.sequence(H))
   };
}
