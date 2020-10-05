import type { Just, Maybe, Nothing } from "./Maybe";

/*
 * -------------------------------------------
 * Typeguards
 * -------------------------------------------
 */

export const isNothing = <A>(fa: Maybe<A>): fa is Nothing => fa._tag === "Nothing";

export const isJust = <A>(fa: Maybe<A>): fa is Just<A> => fa._tag === "Just";
