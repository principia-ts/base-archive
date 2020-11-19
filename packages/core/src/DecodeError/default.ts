import { identity } from "@principia/prelude";

import * as E from "../Either";
import * as FS from "../FreeSemigroup";
import type { Tree } from "../Tree";
import { drawTree } from "../Tree";
import { info, leaf } from "./constructors";
import { fold } from "./destructors";
import type { DecodeError } from "./model";

export interface ErrorInfo {
  name?: string;
  id?: string;
  message?: string;
}

const showErrorInfo = (info: ErrorInfo): string =>
  info.name && info.message ? `${info.name}: ${info.message}` : info.name ?? info.message ?? "";

export type DecodeErrors = FS.FreeSemigroup<DecodeError<ErrorInfo>>;

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo =>
  !!info?.id || !!info?.name || !!info?.message;

export function error(actual: unknown, expected: string, errorInfo?: ErrorInfo): DecodeErrors {
  return isInfoPopulated(errorInfo)
    ? FS.combine(FS.element(leaf(actual, expected)), FS.element(info(errorInfo)))
    : FS.element(leaf(actual, expected));
}

export function success<A>(a: A): E.Either<DecodeErrors, A> {
  return E.right(a);
}

export function failure<A = never>(
  actual: unknown,
  expected: string,
  info?: ErrorInfo
): E.Either<DecodeErrors, A> {
  return E.left(error(actual, expected, info));
}

const empty: ReadonlyArray<never> = [];

const make = <A>(value: A, forest: ReadonlyArray<Tree<A>> = empty): Tree<A> => ({
  value,
  forest
});

const toTree: (e: DecodeError<ErrorInfo>) => Tree<string> = fold({
  Leaf: (input, expected) =>
    make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, empty),
  Key: (key, kind, errors) => make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
  Index: (index, kind, errors) => make(`${kind} index ${index}`, toForest(errors)),
  Member: (index, errors) => make(`member ${index}`, toForest(errors)),
  Lazy: (id, errors) => make(`lazy type ${id}`, toForest(errors)),
  Wrap: (error, errors) => make(showErrorInfo(error), toForest(errors)),
  Info: (error) => make(showErrorInfo(error))
});

export function toForest(e: DecodeErrors): ReadonlyArray<Tree<string>> {
  const stack = [];
  let focus = e;
  const res = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (focus._tag) {
      case "Element":
        res.push(toTree(focus.value));
        if (stack.length === 0) {
          return res;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          focus = stack.pop()!;
        }
        break;
      case "Combine":
        stack.push(focus.right);
        focus = focus.left;
        break;
    }
  }
}

export function draw(e: DecodeErrors): string {
  return toForest(e)
    .map(drawTree({ show: identity }))
    .join("\n");
}
