export const fromSet = <A>(s: Set<A>): ReadonlySet<A> => new Set(s);
export const empty: ReadonlySet<never> = new Set();
export const singleton = <A>(a: A): ReadonlySet<A> => new Set([a]);
