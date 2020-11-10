import { identity } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import { foreach_ } from "../_core";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import type { Task } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachParN_ } from "./foreachParN";

export type TupleR<T extends NonEmptyArray<Task<any, any, any>>> = UnionToIntersection<
   {
      [K in keyof T]: [T[K]] extends [Task<infer R, any, any>] ? (unknown extends R ? never : R) : never;
   }[number]
>;

export type TupleE<T extends NonEmptyArray<Task<any, any, any>>> = {
   [K in keyof T]: [T[K]] extends [Task<any, infer E, any>] ? E : never;
}[number];

export type TupleA<T extends NonEmptyArray<Task<any, any, any>>> = {
   [K in keyof T]: [T[K]] extends [Task<any, any, infer A>] ? A : never;
};

export const tuple = <A extends NonEmptyArray<Task<any, any, any>>>(...t: A): Task<TupleR<A>, TupleE<A>, TupleA<A>> =>
   foreach_(t, identity) as any;

export const tuplePar = <A extends NonEmptyArray<Task<any, any, any>>>(
   ...t: A
): Task<TupleR<A>, TupleE<A>, TupleA<A>> => foreachPar_(t, identity) as any;

export const tupleParN = (n: number) => <A extends NonEmptyArray<Task<any, any, any>>>(
   ...t: A
): Task<TupleR<A>, TupleE<A>, TupleA<A>> => foreachParN_(n)(t, identity) as any;
