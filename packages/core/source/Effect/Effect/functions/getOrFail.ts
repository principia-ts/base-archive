import { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { IO } from "../core";
import { fail, succeed } from "../core";

export const getOrFail = <A>(v: Option<A>): IO<NoSuchElementException, A> =>
   O.fold_(v, () => fail(new NoSuchElementException("Effect.getOrFail")), succeed);

export const getOrFailUnit = <A>(v: Option<A>): IO<void, A> => O.fold_(v, () => fail(undefined), succeed);
