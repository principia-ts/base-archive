import type { DataSource } from "../DataSource";
import type { BlockedRequest } from "./BlockedRequest";
import type { Chunk } from "@principia/io/Chunk";

import * as It from "@principia/base/data/Iterable";
import * as Map from "@principia/base/data/Map";
import * as O from "@principia/base/data/Option";
import * as C from "@principia/io/Chunk";

import { eqDataSource } from "../DataSource";

export class Sequential<R> {
  readonly _tag = "Sequential";

  constructor(private map: ReadonlyMap<DataSource<any, any>, Chunk<Chunk<BlockedRequest<any>>>>) {}

  ["++"]<R1>(that: Sequential<R1>): Sequential<R & R1> {
    return new Sequential(
      It.foldLeft_(that.map.entries(), this.map, (map, [k, v]) =>
        Map.insertAt_(eqDataSource)(
          map,
          k,
          O.fold_(Map.lookupAt_(eqDataSource)(map, k), () => C.empty(), C.concat(v))
        )
      )
    );
  }

  get isEmpty() {
    return this.map.size === 0;
  }

  get keys(): Iterable<DataSource<R, any>> {
    return this.map.keys();
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, Chunk<Chunk<BlockedRequest<any>>>]> {
    return this.map.entries();
  }
}
