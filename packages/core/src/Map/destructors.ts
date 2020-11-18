/**
 * Construct a new mutable map by copying this one
 */
export function toMutable<K, A>(m: ReadonlyMap<K, A>): Map<K, A> {
  return new Map(m);
}
