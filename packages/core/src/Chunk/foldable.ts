import { isEmpty } from "./guards";
import type { Chunk } from "./model";

export function reduce_<A, B>(fa: Chunk<A>, b: B, f: (b: B, a: A) => B): B {
  let x = b;
  for (const y of fa) {
    x = f(x, y);
  }
  return x;
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (fa: Chunk<A>) => B {
  return (fa) => reduce_(fa, b, f);
}

export function reduceRight_<A, B>(fa: Chunk<A>, b: B, f: (a: A, b: B) => B): B {
  if (isEmpty(fa)) {
    return b;
  }
  let x = b;
  for (let i = fa.length; i > 0; i--) {
    x = f(fa[i], x);
  }
  return x;
}

export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B): (fa: Chunk<A>) => B {
  return (fa) => reduceRight_(fa, b, f);
}
