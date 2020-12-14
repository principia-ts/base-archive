import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import * as BA from "@principia/core/FreeBooleanAlgebra";
import type { Has } from "@principia/core/Has";
import type { URIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import type { Cause } from "@principia/core/IO/Cause";
import * as O from "@principia/core/Option";
import * as Str from "@principia/core/String";
import type { USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";
import { matchTag, matchTag_ } from "@principia/core/Utils";
import { pipe } from "@principia/prelude";

import type { ExecutedSpec } from "../ExecutedSpec";
import * as ES from "../ExecutedSpec";
import type { FailureDetails } from "../FailureDetails";
import { TestLogger } from "../TestLogger";
import type { Fragment, Message } from "./FailureMessage";
import * as FM from "./FailureMessage";
import { ANSI_RESET, blue, cyan, green, red } from "./RenderUtils";

export function report<E>(
  duration: number,
  executedSpec: ExecutedSpec<E>
): URIO<Has<TestLogger>, void> {
  const rendered = A.chain_(render(executedSpec), (r) => r.rendered);
  const stats = logStats(duration, executedSpec);

  return I.asksServiceM(TestLogger)((l) => l.logLine(A.append(stats)(rendered).join("\n")));
}

export function logStats<E>(duration: number, executedSpec: ExecutedSpec<E>): string {
  const [success, ignore, failure] = ES.fold_<E, readonly [number, number, number]>(
    executedSpec,
    matchTag({
      Suite: ({ specs }) =>
        A.reduce_(
          specs,
          [0, 0, 0] as readonly [number, number, number],
          ([x1, x2, x3], [y1, y2, y3]) => [x1 + y1, x2 + y2, x3 + y3] as const
        ),
      Test: ({ test }) =>
        E.fold_(
          test,
          (_) => [0, 0, 1],
          matchTag({ Succeeded: () => [1, 0, 0], Ignored: () => [0, 1, 0] })
        ) as readonly [number, number, number]
    })
  );

  const total = success + ignore + failure;

  return cyan(
    `Ran ${total} test${
      total === 1 ? "" : "s"
    } in ${duration}ms: ${success} succeeded, ${ignore} ignored, ${failure} failed`
  );
}

export function render<E>(executedSpec: ExecutedSpec<E>): ReadonlyArray<RenderedResult<string>> {
  const loop = (
    executedSpec: USync<ExecutedSpec<E>>,
    depth: number
  ): USync<ReadonlyArray<RenderedResult<string>>> =>
    Sy.chain_(executedSpec, (executedSpec) =>
      matchTag_(executedSpec, {
        Suite: ({ label, specs }) => {
          const hasFailures = ES.exists_(
            executedSpec,
            matchTag({
              Test: ({ test }) => E.isLeft(test),
              Suite: () => false
            })
          );
          const status: Status = hasFailures ? { _tag: "Failed" } : { _tag: "Passed" };
          const renderedLabel = A.isEmpty(specs)
            ? []
            : hasFailures
            ? [renderFailureLabel(label, depth)]
            : [renderSuccessLabel(label, depth)];

          const rest = pipe(
            specs,
            Sy.foreach((es) => loop(Sy.succeed(es), depth + tabSize)),
            Sy.map((rr) => A.flatten(rr))
          );

          return Sy.map_(rest, (rest) => [
            rendered({ _tag: "Suite" }, label, status, depth, [...renderedLabel]),
            ...rest
          ]);
        },
        Test: ({ label, test }) => {
          const renderedResult = E.fold_(
            test,
            matchTag({
              AssertionFailure: ({ result }) =>
                Sy.succeed([
                  BA.fold_(
                    result,
                    (details: FailureDetails) =>
                      rendered(
                        { _tag: "Test" },
                        label,
                        { _tag: "Failed" },
                        depth,
                        renderFailure(label, depth, details)
                      ),
                    (_, __) => _["&&"](__),
                    (_, __) => _["||"](__),
                    (_) => _["!"]()
                  )
                ]),
              RuntimeFailure: ({ cause }) =>
                Sy.succeed([
                  rendered({ _tag: "Test" }, label, { _tag: "Failed" }, depth, [
                    renderFailureLabel(label, depth),
                    renderCause(cause, depth)
                  ])
                ])
            }),
            matchTag({
              Succeeded: () =>
                Sy.succeed([
                  rendered({ _tag: "Test" }, label, { _tag: "Passed" }, depth, [
                    withOffset(depth)(`${green("+")} ${label}`)
                  ])
                ]),
              Ignored: () =>
                Sy.succeed([rendered({ _tag: "Test" }, label, { _tag: "Ignored" }, depth, [])])
            })
          );

          return renderedResult;
        }
      })
    );

  return Sy.runIO(loop(Sy.succeed(executedSpec), 0));
}

function rendered(
  caseType: CaseType,
  label: string,
  status: Status,
  offset: number,
  rendered: ReadonlyArray<string>
): RenderedResult<string> {
  return new RenderedResult(caseType, label, status, offset, rendered);
}

function renderFailure(
  label: string,
  offset: number,
  details: FailureDetails
): ReadonlyArray<string> {
  return A.prepend(renderFailureLabel(label, offset))(renderFailureDetails(details, offset));
}

function renderSuccessLabel(label: string, offset: number): string {
  return withOffset(offset)(`${green("+")} ${label}`);
}

function renderFailureLabel(label: string, offset: number): string {
  return withOffset(offset)(red(`- ${label}`));
}

function renderFailureDetails(
  failureDetails: FailureDetails,
  offset: number
): ReadonlyArray<string> {
  return renderToStringLines(FM.renderFailureDetails(failureDetails, offset));
}

function renderCause(cause: Cause<any>, offset: number): string {
  return renderToStringLines(FM.renderCause(cause, offset)).join("\n");
}

function withOffset(n: number): (s: string) => string {
  return (s) => " ".repeat(n) + s;
}

function renderToStringLines(message: Message): ReadonlyArray<string> {
  const renderFragment = (f: Fragment) =>
    f.colorCode !== "" ? f.colorCode + f.text + ANSI_RESET : f.text;
  return A.map_(message.lines, (line) =>
    withOffset(line.offset)(A.reduce_(line.fragments, "", (str, f) => str + renderFragment(f)))
  );
}

const tabSize = 2;

class RenderedResult<T> {
  constructor(
    readonly caseType: CaseType,
    readonly label: string,
    readonly status: Status,
    readonly offset: number,
    readonly rendered: ReadonlyArray<T>
  ) {}

  ["&&"](that: RenderedResult<T>): RenderedResult<T> {
    const selfTag = this.status._tag;
    const thatTag = that.status._tag;

    return selfTag === "Ignored"
      ? that
      : thatTag === "Ignored"
      ? this
      : selfTag === "Failed" && thatTag === "Failed"
      ? new RenderedResult(
          this.caseType,
          this.label,
          this.status,
          this.offset,
          A.concat_(
            this.rendered,
            O.getOrElse_(A.tail(that.rendered), () => [])
          )
        )
      : selfTag === "Passed"
      ? that
      : thatTag === "Passed"
      ? this
      : this;
  }

  ["||"](that: RenderedResult<T>): RenderedResult<T> {
    const selfTag = this.status._tag;
    const thatTag = that.status._tag;

    return selfTag === "Ignored"
      ? that
      : thatTag === "Ignored"
      ? this
      : selfTag === "Failed" && thatTag === "Failed"
      ? new RenderedResult(
          this.caseType,
          this.label,
          this.status,
          this.offset,
          A.concat_(
            this.rendered,
            O.getOrElse_(A.tail(that.rendered), () => [])
          )
        )
      : selfTag === "Passed"
      ? this
      : thatTag === "Passed"
      ? that
      : this;
  }

  ["!"](): RenderedResult<T> {
    return matchTag_(this.status, {
      Ignored: () => this,
      Failed: () =>
        new RenderedResult(
          this.caseType,
          this.label,
          { _tag: "Passed" },
          this.offset,
          this.rendered
        ),
      Passed: () =>
        new RenderedResult(
          this.caseType,
          this.label,
          { _tag: "Failed" },
          this.offset,
          this.rendered
        )
    });
  }
}

interface Failed {
  readonly _tag: "Failed";
}

interface Passed {
  readonly _tag: "Passed";
}

interface Ignored {
  readonly _tag: "Ignored";
}

type Status = Failed | Passed | Ignored;

interface Test {
  readonly _tag: "Test";
}

interface Suite {
  readonly _tag: "Suite";
}

type CaseType = Test | Suite;
