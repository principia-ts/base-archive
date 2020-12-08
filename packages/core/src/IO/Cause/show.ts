import * as A from "../../Array/_core";
import { pipe } from "../../Function";
import type { NonEmptyArray } from "../../NonEmptyArray";
import * as O from "../../Option";
import * as Sy from "../../Sync";
import type { FiberId } from "../Fiber/FiberId";
import type { Trace } from "../Fiber/tracing";
import { prettyTrace } from "../Fiber/tracing";
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

export type Renderer = (_: Trace) => string;

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[];

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
    : [];

function renderTrace(trace: O.Option<Trace>, renderer: Renderer) {
  return trace._tag === "None" ? ["No Trace available."] : lines(renderer(trace.value));
}

const renderInterrupt = (
  fiberId: FiberId,
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      `An interrupt was produced by #${fiberId.seqNumber}.`,
      "",
      ...renderTrace(trace, renderer)
    ])
  ]);

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error));

const renderDie = (error: Error, trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ]);

const renderDieUnknown = (
  error: string[],
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure(["An unchecked error was produced.", "", ...error, ...renderTrace(trace, renderer)])
  ]);

const renderFail = (error: string[], trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure(["A checked error was not handled.", "", ...error, ...renderTrace(trace, renderer)])
  ]);

const renderFailError = (error: Error, trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ]);

const causeToSequential = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Sequential> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return Sequential([]);
      }
      case "Fail": {
        return cause.value instanceof Error
          ? renderFailError(cause.value, O.none(), renderer)
          : renderFail(lines(JSON.stringify(cause.value, null, 2)), O.none(), renderer);
      }
      case "Die": {
        return cause.value instanceof Error
          ? renderDie(cause.value, O.none(), renderer)
          : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)), O.none(), renderer);
      }
      case "Interrupt": {
        return renderInterrupt(cause.fiberId, O.none(), renderer);
      }
      case "Then": {
        return Sequential(yield* _(linearSegments(cause, renderer)));
      }
      case "Both": {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))]);
      }
      case "Traced": {
        switch (cause.cause._tag) {
          case "Fail": {
            return cause.cause.value instanceof Error
              ? renderFailError(cause.cause.value, O.some(cause.trace), renderer)
              : renderFail(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                );
          }
          case "Die": {
            return cause.cause.value instanceof Error
              ? renderDie(cause.cause.value, O.some(cause.trace), renderer)
              : renderDieUnknown(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                );
          }
          case "Interrupt": {
            return renderInterrupt(cause.cause.fiberId, O.some(cause.trace), renderer);
          }
          default: {
            return Sequential([
              Failure([
                "An error was rethrown with a new trace.",
                ...renderTrace(O.some(cause.trace), renderer)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ]);
          }
        }
      }
    }
  });

const linearSegments = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Step[]> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Then": {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ];
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all;
      }
    }
  });

const parallelSegments = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Sequential[]> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Both": {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ];
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))];
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

const prettyLines = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<readonly string[]> =>
  Sy.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer));

    if (s.all.length === 1 && s.all[0]._tag === "Failure") {
      return s.all[0].lines;
    }

    return O.getOrElse_(A.updateAt(0, "╥")(format(s)), (): string[] => []);
  });

export function prettyM<E>(cause: Cause<E>, renderer: Renderer): Sy.USync<string> {
  return Sy.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer));
    return lines.join("\n");
  });
}

export function pretty<E>(cause: Cause<E>, renderer: Renderer = prettyTrace): string {
  return Sy.runIO(prettyM(cause, renderer));
}
