import { bind_, bindTo_, flow, pipe } from "../Function";
import * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { BindSF } from "./BindSF";
import type { BindToSF } from "./BindToSF";
import type { LetSF } from "./LetSF";

export interface Do<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
   readonly bindS: BindSF<F, C>;
   readonly letS: LetSF<F, C>;
   readonly bindToS: BindToSF<F, C>;
}

export function deriveDo<F extends HKT.URIS, C = HKT.Auto>(M: Monad<F, C>): Do<F, C>;
export function deriveDo<F>(M: Monad<HKT.UHKT<F>>): Do<HKT.UHKT<F>> {
   const bindS: BindSF<HKT.UHKT<F>> = (name, f) =>
      M.chain((a) =>
         pipe(
            f(a),
            M.map((b) => bind_(a, name, b))
         )
      );
   return HKT.instance<Do<HKT.UHKT<F>>>({
      ...M,
      bindS,
      letS: (name, f) => bindS(name, flow(f, M.pure)),
      bindToS: (name) => (ma) => M._map(ma, bindTo_(name))
   });
}
