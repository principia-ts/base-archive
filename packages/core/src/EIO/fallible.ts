import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { Either } from "../Either";
import * as X from "../XPure";
import { Fail } from "./fail";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * Fallible EIO
 * -------------------------------------------
 */

export const recover: <E, A>(fa: EIO<E, A>) => EIO<never, Either<E, A>> = X.recover;

export const absolve: <E, E1, A>(fa: EIO<E, Either<E1, A>>) => EIO<E | E1, A> = X.absolve;

export const Fallible: P.Fallible<[URI], V> = HKT.instance({
  ...Fail,
  absolve,
  recover
});
