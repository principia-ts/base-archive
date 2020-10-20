import type { Semigroup } from "@principia/prelude/Semigroup";

import type { FreeSemigroup } from "../FreeSemigroup";
import * as FS from "../FreeSemigroup";

/*
 * -------------------------------------------
 * DecodeError Model
 * -------------------------------------------
 */

export const required = "required";

export const optional = "optional";

export type Kind = typeof required | typeof optional;

export interface Leaf<E> {
   readonly _tag: "Leaf";
   readonly actual: unknown;
   readonly error: E;
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

export type DecodeError<E> = Leaf<E> | Key<E> | Index<E> | Member<E> | Lazy<E> | Wrap<E>;

export const leaf = <E>(actual: unknown, error: E): DecodeError<E> => ({ _tag: "Leaf", actual, error });

export const key = <E>(key: string, kind: Kind, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> => ({
   _tag: "Key",
   key,
   kind,
   errors
});

export const index = <E>(index: number, kind: Kind, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> => ({
   _tag: "Index",
   index,
   kind,
   errors
});

export const member = <E>(index: number, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> => ({
   _tag: "Member",
   index,
   errors
});

export const lazy = <E>(id: string, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> => ({
   _tag: "Lazy",
   id,
   errors
});

export const wrap = <E>(error: E, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> => ({
   _tag: "Wrap",
   error,
   errors
});

export const fold = <E, R>(patterns: {
   Leaf: (input: unknown, error: E) => R;
   Key: (key: string, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
   Index: (index: number, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
   Member: (index: number, errors: FreeSemigroup<DecodeError<E>>) => R;
   Lazy: (id: string, errors: FreeSemigroup<DecodeError<E>>) => R;
   Wrap: (error: E, errors: FreeSemigroup<DecodeError<E>>) => R;
}): ((e: DecodeError<E>) => R) => {
   const f = (e: DecodeError<E>): R => {
      switch (e._tag) {
         case "Leaf":
            return patterns.Leaf(e.actual, e.error);
         case "Key":
            return patterns.Key(e.key, e.kind, e.errors);
         case "Index":
            return patterns.Index(e.index, e.kind, e.errors);
         case "Member":
            return patterns.Member(e.index, e.errors);
         case "Lazy":
            return patterns.Lazy(e.id, e.errors);
         case "Wrap":
            return patterns.Wrap(e.error, e.errors);
      }
   };
   return f;
};

export function getSemigroup<E = never>(): Semigroup<FreeSemigroup<DecodeError<E>>> {
   return FS.getSemigroup();
}
