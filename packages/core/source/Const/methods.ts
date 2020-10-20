import type * as TC from "@principia/prelude";

import { unsafeCoerce } from "../Function";
import { make } from "./constructors";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Const Methods
 * -------------------------------------------
 */

export const map_: TC.MapFn_<[URI], V> = (fa, _) => unsafeCoerce(fa);

export const map: TC.MapFn<[URI], V> = () => unsafeCoerce;

export const bimap_: TC.BimapFn_<[URI], V> = (pab, f, _) => make(f(pab));

export const bimap: TC.BimapFn<[URI], V> = (f, g) => (pab) => bimap_(pab, f, g);

export const first_: TC.FirstFn_<[URI], V> = (pab, f) => make(f(pab));

export const first: TC.FirstFn<[URI], V> = (f) => (pab) => make(f(pab));

export const contramap_: TC.ContramapFn_<[URI], V> = (fa, _) => unsafeCoerce(fa);

export const contramap: TC.ContramapFn<[URI], V> = unsafeCoerce;
