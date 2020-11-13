import { fst, snd } from "./destructors";
import type { Tuple } from "./model";

export function swap<A, I>(ai: Tuple<A, I>): Tuple<I, A> {
   return [snd(ai), fst(ai)];
}
