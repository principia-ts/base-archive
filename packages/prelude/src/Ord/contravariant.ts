import { fromCompare } from "./combinators";
import type { Ord } from "./Ord";

export function contramap_<A, B>(fa: Ord<A>, f: (b: B) => A): Ord<B> {
  return fromCompare((x, y) => fa.compare_(f(x), f(y)));
}

export function contramap<A, B>(f: (b: B) => A): (fa: Ord<A>) => Ord<B> {
  return (fa) => contramap_(fa, f);
}
