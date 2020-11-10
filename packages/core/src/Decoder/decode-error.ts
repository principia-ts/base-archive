import { identity } from "@principia/prelude";

import * as E from "../Either";
import * as FS from "../FreeSemigroup";
import type { Tree } from "../Tree";
import { drawTree } from "../Tree";
import * as DE from "./DecodeError";

export interface ErrorInfo {
   name?: string;
   id?: string;
   message?: string;
}

const showErrorInfo = (info: ErrorInfo): string =>
   info.name && info.message ? `${info.name}: ${info.message}` : info.name ?? info.message ?? "";

export type DecodeError = FS.FreeSemigroup<DE.DecodeError<ErrorInfo>>;

const isInfoPopulated = (info?: ErrorInfo): info is ErrorInfo => !!info?.id || !!info?.name || !!info?.message;

export const error = (actual: unknown, expected: string, info?: ErrorInfo): DecodeError =>
   isInfoPopulated(info)
      ? FS.combine(FS.element(DE.leaf(actual, expected)), FS.element(DE.info(info)))
      : FS.element(DE.leaf(actual, expected));

export const success: <A>(a: A) => E.Either<DecodeError, A> = E.right;

export const failure = <A = never>(actual: unknown, expected: string, info?: ErrorInfo): E.Either<DecodeError, A> =>
   E.left(error(actual, expected, info));

const empty: ReadonlyArray<never> = [];

const make = <A>(value: A, forest: ReadonlyArray<Tree<A>> = empty): Tree<A> => ({
   value,
   forest
});

const toTree: (e: DE.DecodeError<ErrorInfo>) => Tree<string> = DE.fold({
   Leaf: (input, expected) => make(`cannot decode ${JSON.stringify(input)}, should be ${expected}`, empty),
   Key: (key, kind, errors) => make(`${kind} property ${JSON.stringify(key)}`, toForest(errors)),
   Index: (index, kind, errors) => make(`${kind} index ${index}`, toForest(errors)),
   Member: (index, errors) => make(`member ${index}`, toForest(errors)),
   Lazy: (id, errors) => make(`lazy type ${id}`, toForest(errors)),
   Wrap: (error, errors) => make(showErrorInfo(error), toForest(errors)),
   Info: (error) => make(showErrorInfo(error))
});

export const toForest = (e: DecodeError): ReadonlyArray<Tree<string>> => {
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
               focus = stack.pop()!;
            }
            break;
         case "Combine":
            stack.push(focus.right);
            focus = focus.left;
            break;
      }
   }
};

export const draw = (e: DecodeError): string =>
   toForest(e)
      .map(drawTree({ show: identity }))
      .join("\n");
