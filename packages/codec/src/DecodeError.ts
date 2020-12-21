import type { Semigroup } from "@principia/base/Semigroup";
import type { FreeSemigroup } from "@principia/free/FreeSemigroup";

import * as FS from "@principia/free/FreeSemigroup";

/*
 * -------------------------------------------
 * Model
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

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function leaf<E>(actual: unknown, expected: string): DecodeError<E> {
  return {
    _tag: "Leaf",
    actual,
    expected
  };
}

export function key<E>(
  key: string,
  kind: Kind,
  errors: FreeSemigroup<DecodeError<E>>
): DecodeError<E> {
  return {
    _tag: "Key",
    key,
    kind,
    errors
  };
}

export function index<E>(
  index: number,
  kind: Kind,
  errors: FreeSemigroup<DecodeError<E>>
): DecodeError<E> {
  return {
    _tag: "Index",
    index,
    kind,
    errors
  };
}

export function member<E>(index: number, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> {
  return {
    _tag: "Member",
    index,
    errors
  };
}

export function lazy<E>(id: string, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> {
  return {
    _tag: "Lazy",
    id,
    errors
  };
}

export function wrap<E>(error: E, errors: FreeSemigroup<DecodeError<E>>): DecodeError<E> {
  return {
    _tag: "Wrap",
    error,
    errors
  };
}

export function info<E>(error: E): DecodeError<E> {
  return {
    _tag: "Info",
    error
  };
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export function fold<E, R>(patterns: {
  Leaf: (input: unknown, expected: string) => R;
  Key: (key: string, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
  Index: (index: number, kind: Kind, errors: FreeSemigroup<DecodeError<E>>) => R;
  Member: (index: number, errors: FreeSemigroup<DecodeError<E>>) => R;
  Lazy: (id: string, errors: FreeSemigroup<DecodeError<E>>) => R;
  Wrap: (error: E, errors: FreeSemigroup<DecodeError<E>>) => R;
  Info: (error: E) => R;
}): (e: DecodeError<E>) => R {
  const f = (e: DecodeError<E>): R => {
    switch (e._tag) {
      case "Leaf":
        return patterns.Leaf(e.actual, e.expected);
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
      case "Info":
        return patterns.Info(e.error);
    }
  };
  return f;
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

export function getSemigroup<E = never>(): Semigroup<FreeSemigroup<DecodeError<E>>> {
  return FS.getSemigroup();
}
