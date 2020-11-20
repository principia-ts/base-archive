/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import { inspect } from "util";

import * as A from "../src/Array";
import * as E from "../src/Either";
import * as I from "../src/Iterable";

function* infinite() {
  let i = 0;
  while (true) {
    yield i;
    i += 1;
  }
}

console.time("a");

function partitionEvenOdd(n: number) {
  return n % 2 === 0 ? E.right(n) : E.left(n);
}

const is = I.iterable(infinite)
  ["|>"](I.take(100000))
  ["|>"](I.partitionMap(partitionEvenOdd))
  ["|>"]((x) => ({
    left: I.toArray(x.left),
    right: I.toArray(x.right)
  }));

console.log(is);

console.timeEnd("a");

console.time("b");

const as = A.range(0, 100000)["|>"](A.partitionMap(partitionEvenOdd));
console.log(as);

console.timeEnd("b");
