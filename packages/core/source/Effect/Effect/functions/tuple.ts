import { identity } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";
import type { NonEmptyArray } from "packages/core/source/NonEmptyArray";

import { foreach_ } from "../core";
import type { Effect } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

export type TupleR<T extends NonEmptyArray<Effect<any, any, any>>> = UnionToIntersection<
   {
      [K in keyof T]: [T[K]] extends [Effect<infer R, any, any>] ? (unknown extends R ? never : R) : never;
   }[number]
>;

export type TupleE<T extends NonEmptyArray<Effect<any, any, any>>> = {
   [K in keyof T]: [T[K]] extends [Effect<any, infer E, any>] ? E : never;
}[number];

export type TupleA<T extends NonEmptyArray<Effect<any, any, any>>> = {
   [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never;
};

export const tuple = <A extends NonEmptyArray<Effect<any, any, any>>>(
   ...t: A
): Effect<TupleR<A>, TupleE<A>, TupleA<A>> => foreach_(t, identity) as any;

export const tuplePar = <A extends NonEmptyArray<Effect<any, any, any>>>(
   ...t: A
): Effect<TupleR<A>, TupleE<A>, TupleA<A>> => foreachPar_(t, identity) as any;

export const tupleParN = (n: number) => <A extends NonEmptyArray<Effect<any, any, any>>>(
   ...t: A
): Effect<TupleR<A>, TupleE<A>, TupleA<A>> => foreachParN_(n)(t, identity) as any;
