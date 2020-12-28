import type { DataSource } from "../DataSource";
import type { BlockedRequest } from "./BlockedRequest";
import type { Chunk } from "@principia/io/Chunk";

import * as It from "@principia/base/data/Iterable";
import * as Map from "@principia/base/data/Map";
import * as O from "@principia/base/data/Option";
import * as C from "@principia/io/Chunk";

import { eqDataSource } from "../DataSource";
import { Sequential } from "./Sequential";

export class Parallel<R> {
  readonly _tag = "Parallel";

  constructor(private map: ReadonlyMap<DataSource<any, any>, Chunk<BlockedRequest<any>>>) {}

  ["++"]<R1>(that: Parallel<R1>): Parallel<R & R1> {
    return new Parallel(
      It.foldLeft_(that.map.entries(), this.map, (map, [k, v]) =>
        Map.insertAt_(eqDataSource)(
          map,
          k,
          O.fold_(Map.lookupAt_(eqDataSource)(map, k), () => v, C.concat(v))
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

  get sequential(): Sequential<R> {
    return new Sequential(Map.map_(this.map, C.single));
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, Chunk<BlockedRequest<any>>]> {
    return this.map.entries();
  }
}

export function empty<R>(): Parallel<R> {
  return new Parallel(Map.empty());
}

export function from<R, A>(dataSource: DataSource<R, A>, blockedRequest: BlockedRequest<A>) {
  return new Parallel(
    Map.insertAt_(eqDataSource)(Map.empty(), dataSource, C.single(blockedRequest))
  );
}
