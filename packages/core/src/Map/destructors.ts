/**
 * Construct a new mutable map by copying this one
 */
export const toMutable = <K, A>(m: ReadonlyMap<K, A>): Map<K, A> => new Map(m);
