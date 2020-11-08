import type { Tuple } from "./model";

export const fst = <A, E>(ae: Tuple<A, E>): A => ae[0];

export const snd = <A, E>(ae: Tuple<A, E>): E => ae[1];
