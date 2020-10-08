import type { None, Option, Some } from "./Option";

/*
 * -------------------------------------------
 * Typeguards
 * -------------------------------------------
 */

export const isNone = <A>(fa: Option<A>): fa is None => fa._tag === "None";

export const isSome = <A>(fa: Option<A>): fa is Some<A> => fa._tag === "Some";
