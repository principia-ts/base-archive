import type { EIO } from "../_core";
import { fail, succeed } from "../_core";
import { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import * as O from "../../../Option";

export function getOrFail<A>(v: Option<A>): EIO<NoSuchElementException, A> {
  return O.fold_(v, () => fail(new NoSuchElementException("Task.getOrFail")), succeed);
}

export function getOrFailUnit<A>(v: Option<A>): EIO<void, A> {
  return O.fold_(v, () => fail(undefined), succeed);
}
