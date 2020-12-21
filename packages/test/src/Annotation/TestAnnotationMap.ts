import type { TestAnnotation } from "./TestAnnotation";

import * as A from "@principia/base/data/Array";
import { identity, pipe } from "@principia/base/data/Function";
import * as RMap from "@principia/base/data/Map";
import * as O from "@principia/base/data/Option";

export class TestAnnotationMap {
  constructor(private readonly map: ReadonlyMap<TestAnnotation<any>, any>) {}

  combine(that: TestAnnotationMap): TestAnnotationMap {
    return new TestAnnotationMap(
      pipe(
        A.from(this.map),
        A.concat(A.from(that.map)),
        A.foldLeft(new Map<TestAnnotation<any>, any>(), (acc, [key, value]) =>
          acc.set(
            key,
            O.fold_(
              O.fromNullable(acc.get(key)),
              () => value,
              (_) => key.combine(_, value)
            )
          )
        )
      )
    );
  }

  get<V>(key: TestAnnotation<V>): V {
    return O.fold_(O.fromNullable(this.map.get(key)), () => key.initial, identity);
  }

  private overwrite<V>(key: TestAnnotation<V>, value: V): TestAnnotationMap {
    return new TestAnnotationMap(RMap.insert_(this.map, key, value));
  }

  private update<V>(key: TestAnnotation<V>, f: (v: V) => V): TestAnnotationMap {
    return this.overwrite(key, f(this.get(key)));
  }

  annotate<V>(key: TestAnnotation<V>, value: V): TestAnnotationMap {
    return this.update(key, (_) => key.combine(_, value));
  }

  static empty: TestAnnotationMap = new TestAnnotationMap(RMap.empty());
}
