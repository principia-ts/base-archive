import { bind_, bindTo_, flow, pipe } from "../Function";
import * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { BindSFn } from "./BindSF";
import type { BindToSFn } from "./BindToSF";
import type { LetSFn } from "./LetSF";

export interface Do<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
  readonly bindS: BindSFn<F, C>;
  readonly letS: LetSFn<F, C>;
  readonly bindToS: BindToSFn<F, C>;
}

export function deriveDo<F extends HKT.URIS, C = HKT.Auto>(M: Monad<F, C>): Do<F, C>;
export function deriveDo<F>(M: Monad<HKT.UHKT<F>>): Do<HKT.UHKT<F>> {
  const bindS: BindSFn<HKT.UHKT<F>> = (name, f) =>
    flow(
      M.map((a) =>
        pipe(
          f(a),
          M.map((b) => bind_(a, name, b))
        )
      ),
      M.flatten
    );
  return HKT.instance<Do<HKT.UHKT<F>>>({
    ...M,
    bindS,
    letS: (name, f) =>
      bindS(
        name,
        flow(f, (b) => M.map_(M.unit(), () => b))
      ),
    bindToS: (name) => (ma) => M.map_(ma, bindTo_(name))
  });
}
