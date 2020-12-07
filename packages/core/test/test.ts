/* eslint-disable no-unexpected-multiline */
import "@principia/prelude/Operators";

import * as A from "../src/Array";
import * as Chunk from "../src/Chunk";

console.time("A");
let chunk: Chunk.Chunk<number> = Buffer.of(1);
for (let i = 0; i < 10000; i++) {
  chunk = Chunk.append_(chunk, i);
}
console.log(Chunk.asArray(chunk));
console.timeEnd("A");

console.time("B");
let array: Array<number> = [1];
for (let i = 0; i < 10000; i++) {
  array = A.concat_(array, [i]) as Array<number>;
}
console.log(array);
console.timeEnd("B");
