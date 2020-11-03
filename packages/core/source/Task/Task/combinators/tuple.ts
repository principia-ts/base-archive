import { identity } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";
import type { NonEmptyArray } from "packages/core/source/NonEmptyArray";

import { traverseI_ } from "../_core";
import type { Task } from "../model";
import { traverseIPar_ } from "./traverseIPar";
import { traverseIParN_ } from "./traverseIParN";

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
   traverseI_(t, identity) as any;

export const tuplePar = <A extends NonEmptyArray<Task<any, any, any>>>(
   ...t: A
): Task<TupleR<A>, TupleE<A>, TupleA<A>> => traverseIPar_(t, identity) as any;

export const tupleParN = (n: number) => <A extends NonEmptyArray<Task<any, any, any>>>(
   ...t: A
): Task<TupleR<A>, TupleE<A>, TupleA<A>> => traverseIParN_(n)(t, identity) as any;
