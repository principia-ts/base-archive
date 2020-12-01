import type { State } from "./model";

/*
 * -------------------------------------------
 * State Destructors
 * -------------------------------------------
 */

export function evaluate_<S, A>(ma: State<S, A>, s: S): A {
  return ma(s)[0];
}

export function evaluate<S>(s: S): <A>(ma: State<S, A>) => A {
  return (ma) => ma(s)[0];
}

export function execute_<S, A>(ma: State<S, A>, s: S): S {
  return ma(s)[1];
}

export function execute<S>(s: S): <A>(ma: State<S, A>) => S {
  return (ma) => ma(s)[1];
}
