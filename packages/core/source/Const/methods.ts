import { unsafeCoerce } from "../Function";
import type * as TC from "../typeclass-index";
import { URI, V } from "./Const";
import { make } from "./constructors";

/*
 * -------------------------------------------
 * Const Methods
 * -------------------------------------------
 */

export const _map: TC.UC_MapF<[URI], V> = (fa, _) => unsafeCoerce(fa);

export const map: TC.MapF<[URI], V> = () => unsafeCoerce;

export const _bimap: TC.UC_BimapF<[URI], V> = (pab, f, _) => make(f(pab));

export const bimap: TC.BimapF<[URI], V> = (f, g) => (pab) => _bimap(pab, f, g);

export const _first: TC.UC_FirstF<[URI], V> = (pab, f) => make(f(pab));

export const first: TC.FirstF<[URI], V> = (f) => (pab) => make(f(pab));

export const _contramap: TC.UC_ContramapF<[URI], V> = (fa, _) => unsafeCoerce(fa);

export const contramap: TC.ContramapF<[URI], V> = unsafeCoerce;
