import { identity } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import type { NonEmptyArray } from "../../NonEmptyArray";
import { foreach_ } from "../_core";
import type { IO } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

export type TupleR<T extends NonEmptyArray<IO<any, any, any>>> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [IO<infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never;
  }[number]
>;

export type TupleE<T extends NonEmptyArray<IO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [IO<any, infer E, any>] ? E : never;
}[number];

export type TupleA<T extends NonEmptyArray<IO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [IO<any, any, infer A>] ? A : never;
};

export function tuple<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreach_(t, identity) as any;
}

export function tuplePar<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreachPar_(t, identity) as any;
}

export function tupleParN(n: number) {
  return <A extends NonEmptyArray<IO<any, any, any>>>(
    ...t: A
  ): IO<TupleR<A>, TupleE<A>, TupleA<A>> => foreachParN_(n)(t, identity) as any;
}
