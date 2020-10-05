/* eslint-disable @typescript-eslint/no-use-before-define */

import * as A from "@principia/core/Array";
import { Eq } from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";
import { NonEmptyArray } from "@principia/core/NonEmptyArray";
import { Show } from "@principia/core/Show";

import { eqFiberId, FiberId } from "../Fiber/FiberId";
import type { Cause } from "./Cause";

type Segment = Sequential | Parallel | Failure;

type Step = Parallel | Failure;

interface Failure {
   _tag: "Failure";
   lines: string[];
}

interface Parallel {
   _tag: "Parallel";
   all: Sequential[];
}

interface Sequential {
   _tag: "Sequential";
   all: Step[];
}

const Failure = (lines: string[]): Failure => ({
   _tag: "Failure",
   lines
});

const Sequential = (all: Step[]): Sequential => ({
   _tag: "Sequential",
   all
});

const Parallel = (all: Sequential[]): Parallel => ({
   _tag: "Parallel",
   all
});

const headTail = <A>(a: NonEmptyArray<A>): [A, A[]] => {
   const x = [...a];
   const head = x.shift() as A;
   return [head, x];
};

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[];

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
   A.isNonEmpty(values)
      ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
      : [];

const renderInterrupt = (fiberId: FiberId): Sequential =>
   Sequential([Failure([`An interrupt was produced by #${fiberId.seqNumber}.`])]);

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error));

const renderDie = (error: Error): Sequential =>
   Sequential([Failure(["An unchecked error was produced.", ...renderError(error)])]);

const renderDieUnknown = (error: string[]): Sequential =>
   Sequential([Failure(["An unchecked error was produced.", ...error])]);

const renderFail = (error: string[]): Sequential =>
   Sequential([Failure(["A checked error was not handled.", ...error])]);

const renderFailError = (error: Error): Sequential =>
   Sequential([Failure(["A checked error was not handled.", ...renderError(error)])]);

const causeToSequential = <E>(cause: Cause<E>): Sequential => {
   switch (cause._tag) {
      case "Empty": {
         return Sequential([]);
      }
      case "Fail": {
         return cause.value instanceof Error
            ? renderFailError(cause.value)
            : renderFail(lines(JSON.stringify(cause.value, null, 2)));
      }
      case "Die": {
         return cause.value instanceof Error
            ? renderDie(cause.value)
            : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)));
      }
      case "Interrupt": {
         return renderInterrupt(cause.fiberId);
      }
      case "Then": {
         return Sequential(linearSegments(cause));
      }
      case "Both": {
         return Sequential([Parallel(parallelSegments(cause))]);
      }
   }
};

const linearSegments = <E>(cause: Cause<E>): Step[] => {
   switch (cause._tag) {
      case "Then": {
         return [...linearSegments(cause.left), ...linearSegments(cause.right)];
      }
      default: {
         return causeToSequential(cause).all;
      }
   }
};

const parallelSegments = <E>(cause: Cause<E>): Sequential[] => {
   switch (cause._tag) {
      case "Both": {
         return [...parallelSegments(cause.left), ...parallelSegments(cause.right)];
      }
      default: {
         return [causeToSequential(cause)];
      }
   }
};

const times = (s: string, n: number) => {
   let h = "";

   for (let i = 0; i < n; i += 1) {
      h += s;
   }

   return h;
};

const format = (segment: Segment): readonly string[] => {
   switch (segment._tag) {
      case "Failure": {
         return prefixBlock(segment.lines, "─", " ");
      }
      case "Parallel": {
         return [
            times("══╦", segment.all.length - 1) + "══╗",
            ...A._reduceRight(segment.all, [] as string[], (current, acc) => [
               ...prefixBlock(acc, "  ║", "  ║"),
               ...prefixBlock(format(current), "  ", "  ")
            ])
         ];
      }
      case "Sequential": {
         return A._chain(segment.all, (seg) => ["║", ...prefixBlock(format(seg), "╠", "║"), "▼"]);
      }
   }
};

const prettyLines = <E>(cause: Cause<E>): readonly string[] => {
   const s = causeToSequential(cause);

   if (s.all.length === 1 && s.all[0]._tag === "Failure") {
      return s.all[0].lines;
   }

   return Mb._getOrElse(A.updateAt(0, "╥")(format(s)), (): string[] => []);
};

export const prettyPrint = <E>(cause: Cause<E>) => prettyLines(cause).join("\n");

export const showCause: Show<Cause<any>> = {
   show: (cause) => prettyLines(cause).join("\n")
};

export const equalsCause = <E>(x: Cause<E>, y: Cause<E>): boolean => {
   switch (x._tag) {
      case "Fail": {
         return y._tag === "Fail" && x.value === y.value;
      }
      case "Empty": {
         return y._tag === "Empty";
      }
      case "Die": {
         return (
            y._tag === "Die" &&
            ((x.value instanceof Error &&
               y.value instanceof Error &&
               x.value.name === y.value.name &&
               x.value.message === y.value.message) ||
               x.value === y.value)
         );
      }
      case "Interrupt": {
         return y._tag === "Interrupt" && eqFiberId.equals(x.fiberId)(y.fiberId);
      }
      case "Both": {
         return y._tag === "Both" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
      }
      case "Then": {
         return y._tag === "Then" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
      }
   }
};

export const eqCause: Eq<Cause<any>> = {
   equals: (x) => (y) => equalsCause(x, y)
};
