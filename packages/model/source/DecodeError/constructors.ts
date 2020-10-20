import type { FreeSemigroup } from "../FreeSemigroup";
import type { DecodeError, Kind } from "./model";

export const leaf = <E>(actual: unknown, expected: string): DecodeError<E> => ({
   _tag: "Leaf",
   actual,
   expected
});

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

export const info = <E>(error: E): DecodeError<E> => ({
   _tag: "Info",
   error
});
