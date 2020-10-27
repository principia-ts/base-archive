import { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { EIO } from "../core";
import { fail, succeed } from "../core";

export const getOrFail = <A>(v: Option<A>): EIO<NoSuchElementException, A> =>
   O.fold_(v, () => fail(new NoSuchElementException("Task.getOrFail")), succeed);

export const getOrFailUnit = <A>(v: Option<A>): EIO<void, A> => O.fold_(v, () => fail(undefined), succeed);
