import type { Chunk } from "./model";

export function chain_<A, B>(ma: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  let rlen = 0;
  const l = ma.length;
  const temp = new Array(l);
  for (let i = 0; i < l; i++) {
    const e = ma[i];
    const arr = f(e);
    rlen += arr.length;
    temp[i] = arr;
  }
  const r = Array(rlen);
  let start = 0;
  for (let i = 0; i < l; i++) {
    const arr = temp[i];
    const l = arr.length;
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j];
    }
    start += l;
  }
  return r;
}

export function chain<A, B>(f: (a: A) => Chunk<B>): (ma: Chunk<A>) => Chunk<B> {
  return (ma) => chain_(ma, f);
}
