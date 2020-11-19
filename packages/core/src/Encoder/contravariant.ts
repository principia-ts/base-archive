import type { Encoder } from "./model";

/*
 * -------------------------------------------
 * Contravariant Encoder
 * -------------------------------------------
 */

export function contramap_<E, A, B>(fa: Encoder<E, A>, f: (b: B) => A): Encoder<E, B> {
  return {
    encode: (b) => fa.encode(f(b))
  };
}

export function contramap<A, B>(f: (b: B) => A): <E>(fa: Encoder<E, A>) => Encoder<E, B> {
  return (fa) => contramap_(fa, f);
}
