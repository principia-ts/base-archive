import type { Show } from "@principia/prelude/Show";

import * as A from "../../../Array";
import { pipe } from "../../../Function";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import * as O from "../../../Option";
import * as Sy from "../../../Sync";
import type { FiberId } from "../../Fiber/FiberId";
import type { Cause } from "./model";

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

const causeToSequential = <E>(cause: Cause<E>): Sy.IO<Sequential> =>
   Sy.gen(function* (_) {
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
            return Sequential(yield* _(linearSegments(cause)));
         }
         case "Both": {
            return Sequential([Parallel(yield* _(parallelSegments(cause)))]);
         }
      }
   });

const linearSegments = <E>(cause: Cause<E>): Sy.IO<Step[]> =>
   Sy.gen(function* (_) {
      switch (cause._tag) {
         case "Then": {
            return [...(yield* _(linearSegments(cause.left))), ...(yield* _(linearSegments(cause.right)))];
         }
         default: {
            return (yield* _(causeToSequential(cause))).all;
         }
      }
   });

const parallelSegments = <E>(cause: Cause<E>): Sy.IO<Sequential[]> =>
   Sy.gen(function* (_) {
      switch (cause._tag) {
         case "Both": {
            return [...(yield* _(parallelSegments(cause.left))), ...(yield* _(parallelSegments(cause.right)))];
         }
         default: {
            return [yield* _(causeToSequential(cause))];
         }
      }
   });

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
            ...A.reduceRight_(segment.all, [] as string[], (current, acc) => [
               ...prefixBlock(acc, "  ║", "  ║"),
               ...prefixBlock(format(current), "  ", "  ")
            ])
         ];
      }
      case "Sequential": {
         return A.chain_(segment.all, (seg) => ["║", ...prefixBlock(format(seg), "╠", "║"), "▼"]);
      }
   }
};

const prettyLines = <E>(cause: Cause<E>): Sy.IO<readonly string[]> =>
   Sy.gen(function* (_) {
      const s = yield* _(causeToSequential(cause));

      if (s.all.length === 1 && s.all[0]._tag === "Failure") {
         return s.all[0].lines;
      }

      return O.getOrElse_(A.updateAt(0, "╥")(format(s)), (): string[] => []);
   });

export const prettyM = <E>(cause: Cause<E>): Sy.IO<string> =>
   Sy.gen(function* (_) {
      const lines = yield* _(prettyLines(cause));
      return lines.join("\n");
   });

export const pretty = <E>(cause: Cause<E>) => Sy.runIO(prettyM(cause));

export const showCause: Show<Cause<any>> = {
   show: pretty
};
