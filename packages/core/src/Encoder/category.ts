import { identity } from "../Function";
import { contramap_ } from "./contravariant";
import type { Encoder } from "./model";

/*
 * -------------------------------------------
 * Category Encoder
 * -------------------------------------------
 */

export function compose_<E, A, B>(ab: Encoder<A, B>, ea: Encoder<E, A>): Encoder<E, B> {
  return contramap_(ea, ab.encode);
}

export function compose<E, A>(ea: Encoder<E, A>): <B>(ab: Encoder<A, B>) => Encoder<E, B> {
  return (ab) => compose_(ab, ea);
}

export function id<A>(): Encoder<A, A> {
  return {
    encode: identity
  };
}
