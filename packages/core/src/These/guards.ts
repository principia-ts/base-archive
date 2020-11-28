import type { Left, Right } from "../Either";
import type { Both, These } from "./model";

/*
 * -------------------------------------------
 * These Guards
 * -------------------------------------------
 */

export function isLeft<E, A>(fa: These<E, A>): fa is Left<E> {
  return fa._tag === "Left";
}

export function isRight<E, A>(fa: These<E, A>): fa is Right<A> {
  return fa._tag === "Right";
}

export function isBoth<E, A>(fa: These<E, A>): fa is Both<E, A> {
  return fa._tag === "Both";
}
