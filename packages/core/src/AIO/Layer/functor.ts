import * as L from "./core";

/*
 * -------------------------------------------
 * Functor Layer
 * -------------------------------------------
 */

export function map_<R, E, A, B>(fa: L.Layer<R, E, A>, f: (a: A) => B): L.Layer<R, E, B> {
  return new L.LayerMapInstruction(fa, f);
}

export function map<A, B>(f: (a: A) => B): <R, E>(fa: L.Layer<R, E, A>) => L.Layer<R, E, B> {
  return (fa) => map_(fa, f);
}
