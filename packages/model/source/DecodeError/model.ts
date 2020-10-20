import type { FreeSemigroup } from "../FreeSemigroup";

/*
 * -------------------------------------------
 * DecodeError Model
 * -------------------------------------------
 */

export const required = "required";

export const optional = "optional";

export type Kind = typeof required | typeof optional;

export interface Leaf {
   readonly _tag: "Leaf";
   readonly actual: unknown;
   readonly expected: string;
}

export interface Info<E> {
   readonly _tag: "Info";
   error: E;
}

export interface Key<E> {
   readonly _tag: "Key";
   readonly key: string;
   readonly kind: Kind;
   readonly errors: FreeSemigroup<DecodeError<E>>;
}

export interface Index<E> {
   readonly _tag: "Index";
   readonly index: number;
   readonly kind: Kind;
   readonly errors: FreeSemigroup<DecodeError<E>>;
}

export interface Member<E> {
   readonly _tag: "Member";
   readonly index: number;
   readonly errors: FreeSemigroup<DecodeError<E>>;
}

export interface Lazy<E> {
   readonly _tag: "Lazy";
   readonly id: string;
   readonly errors: FreeSemigroup<DecodeError<E>>;
}

export interface Wrap<E> {
   readonly _tag: "Wrap";
   readonly error: E;
   readonly errors: FreeSemigroup<DecodeError<E>>;
}

export type DecodeError<E> = Leaf | Key<E> | Index<E> | Member<E> | Lazy<E> | Wrap<E> | Info<E>;
