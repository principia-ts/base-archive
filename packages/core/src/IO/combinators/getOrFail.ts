import { NoSuchElementException } from "../../GlobalExceptions";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { FIO } from "../_core";
import { fail, succeed } from "../_core";

export function getOrFail<A>(v: Option<A>): FIO<NoSuchElementException, A> {
  return O.fold_(v, () => fail(new NoSuchElementException("IO.getOrFail")), succeed);
}

export function getOrFailUnit<A>(v: Option<A>): FIO<void, A> {
  return O.fold_(v, () => fail(undefined), succeed);
}
