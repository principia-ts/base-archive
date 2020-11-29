import type { AIO } from "../model";
import { swap } from "./swap";

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export function swapWith_<R, E, A, R1, E1, A1>(
  fa: AIO<R, E, A>,
  f: (ef: AIO<R, A, E>) => AIO<R1, A1, E1>
) {
  return swap(f(swap(fa)));
}

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @category Combinators
 * @since 1.0.0
 */
export function swapWith<R, E, A, R1, E1, A1>(
  f: (ef: AIO<R, A, E>) => AIO<R1, A1, E1>
): (fa: AIO<R, E, A>) => AIO<R1, E1, A1> {
  return (fa) => swapWith_(fa, f);
}
