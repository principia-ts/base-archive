import { NoSuchElementException } from "../../GlobalExceptions";
import type { Option } from "../../Option";
import type { IO } from "../model";
import { someOrFail_ } from "./someOrFail";

export function someOrFailException<R, E, A>(
  ma: IO<R, E, Option<A>>
): IO<R, E | NoSuchElementException, A> {
  return someOrFail_(ma, () => new NoSuchElementException("IO.someOrFailException"));
}
