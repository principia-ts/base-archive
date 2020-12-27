import type { Described } from "./Described";

import * as I from "@principia/io/IO";

import { batchN_, DataSource } from "./DataSource";

export abstract class DataSourceAspect<R> {
  readonly _tag = "DataSourceAspect";

  abstract apply<R1, A>(dataSource: DataSource<R1, A>): DataSource<R & R1, A>;

  [">>>"]<R1>(that: DataSourceAspect<R1>): DataSourceAspect<R & R1> {
    const thisApply = this.apply;
    return new (class extends DataSourceAspect<R & R1> {
      apply<R2, A>(dataSource: DataSource<R2, A>): DataSource<R & R1 & R2, A> {
        return that.apply(thisApply(dataSource));
      }
    })();
  }
}

export function around<R, A>(
  before: Described<I.IO<R, never, A>>,
  after: Described<(a: A) => I.IO<R, never, A>>
): DataSourceAspect<R> {
  return new (class extends DataSourceAspect<R> {
    apply<R1, A>(dataSource: DataSource<R1, A>): DataSource<R & R1, A> {
      return DataSource<R & R1, A>(
        `${dataSource.identifier} @@ around(${before.description}, ${after.description})`,
        (requests) => I.bracket_(before.value, (_) => dataSource.runAll(requests), after.value)
      );
    }
  })();
}

export function maxBatchSize(n: number): DataSourceAspect<unknown> {
  return new (class extends DataSourceAspect<unknown> {
    apply<R, A>(dataSource: DataSource<R, A>): DataSource<R, A> {
      return batchN_(dataSource, n);
    }
  })();
}
