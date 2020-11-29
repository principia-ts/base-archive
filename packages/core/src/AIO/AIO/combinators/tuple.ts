import { identity } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import type { NonEmptyArray } from "../../../NonEmptyArray";
import { foreach_ } from "../_core";
import type { AIO } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

export type TupleR<T extends NonEmptyArray<AIO<any, any, any>>> = UnionToIntersection<
  {
    [K in keyof T]: [T[K]] extends [AIO<infer R, any, any>]
      ? unknown extends R
        ? never
        : R
      : never;
  }[number]
>;

export type TupleE<T extends NonEmptyArray<AIO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [AIO<any, infer E, any>] ? E : never;
}[number];

export type TupleA<T extends NonEmptyArray<AIO<any, any, any>>> = {
  [K in keyof T]: [T[K]] extends [AIO<any, any, infer A>] ? A : never;
};

export function tuple<A extends NonEmptyArray<AIO<any, any, any>>>(
  ...t: A
): AIO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreach_(t, identity) as any;
}

export function tuplePar<A extends NonEmptyArray<AIO<any, any, any>>>(
  ...t: A
): AIO<TupleR<A>, TupleE<A>, TupleA<A>> {
  return foreachPar_(t, identity) as any;
}

export function tupleParN(n: number) {
  return <A extends NonEmptyArray<AIO<any, any, any>>>(
    ...t: A
  ): AIO<TupleR<A>, TupleE<A>, TupleA<A>> => foreachParN_(n)(t, identity) as any;
}
