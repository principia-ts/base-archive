import type { FreeSemigroup } from "../FreeSemigroup";
import type { DecodeError, Kind } from "./model";

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
