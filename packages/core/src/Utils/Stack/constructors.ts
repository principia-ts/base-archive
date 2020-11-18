import type { Stack } from "./model";

export const stack = <A>(value: A, previous?: Stack<A>): Stack<A> => ({
  value,
  previous
});
