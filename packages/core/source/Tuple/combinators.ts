import { fst, snd } from "./destructors";
import type { Tuple } from "./model";

export const swap = <A, I>(ai: Tuple<A, I>): Tuple<I, A> => [snd(ai), fst(ai)];
