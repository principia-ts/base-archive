import type { IO } from "../core";
import type { NonEmptyArray } from "@principia/base/data/NonEmptyArray";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import { identity } from "@principia/base/data/Function";

import { foreach_ } from "../core";
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

export function tupleN<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreach_(t, identity) as any;
}

export function tupleNPar<A extends NonEmptyArray<IO<any, any, any>>>(
  ...t: A
): IO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreachPar_(t, identity) as any;
}

export function tupleNParN(n: number) {
  return <A extends NonEmptyArray<IO<any, any, any>>>(
    ...t: A
  ): IO<TupleR<A>, TupleE<A>, TupleA<A>> => foreachParN_(n)(t, identity) as any;
}
