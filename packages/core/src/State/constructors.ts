import type { State } from "./model";

/*
 * -------------------------------------------
 * State Constructors
 * -------------------------------------------
 */

/**
 * Get the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function get<S>(): State<S, S> {
  return (s) => [s, s];
}

/**
 * Set the state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function put<S>(s: S): State<S, void> {
  return () => [undefined, s];
}

/**
 * Modify the state by applying a function to the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function modify<S>(f: (s: S) => S): State<S, void> {
  return (s) => [undefined, f(s)];
}

/**
 * Get a value which depends on the current state
 *
 * @category Constructors
 * @since 1.0.0
 */
export function gets<S, A>(f: (s: S) => A): State<S, A> {
  return (s) => [f(s), s];
}
