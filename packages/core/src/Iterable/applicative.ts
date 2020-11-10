import { zipWith_ } from "./apply";

export const zip = <B>(fb: Iterable<B>) => <A>(fa: Iterable<A>): Iterable<readonly [A, B]> =>
   zipWith_(fa, fb, (a, b) => [a, b] as const);

export const zip_ = <A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> =>
   zipWith_(fa, fb, (a, b) => [a, b] as const);
