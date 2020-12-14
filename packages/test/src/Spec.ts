import * as A from "@principia/core/Array";
import { Has, HasURI, Tag } from "@principia/core/Has";
import type { IO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import type { Cause } from "@principia/core/IO/Cause";
import { foldSafe_ } from "@principia/core/IO/Cause";
import type { ExecutionStrategy } from "@principia/core/IO/ExecutionStrategy";
import type { Layer } from "@principia/core/Layer";
import * as L from "@principia/core/Layer";
import type { Managed } from "@principia/core/Managed";
import { ignore } from "@principia/core/Managed";
import * as M from "@principia/core/Managed";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";
import * as Sy from "@principia/core/Sync";
import { matchTag, matchTag_ } from "@principia/core/Utils";
import { flow, identity, pipe } from "@principia/prelude";

class SuiteCase<R, E, A> {
  readonly _tag = "Suite";
  constructor(
    readonly label: string,
    readonly specs: Managed<R, E, ReadonlyArray<A>>,
    readonly exec: Option<ExecutionStrategy>
  ) {}
}

class TestCase<R, E, T> {
  readonly _tag = "Test";
  constructor(
    readonly label: string,
    readonly test: IO<R, E, T> // readonly annotations: TestAnnotationMap
  ) {}
}

export type SpecCase<R, E, T, A> = SuiteCase<R, E, A> | TestCase<R, E, T>;

export type AbstractSpec<R, E, T> = TestCase<R, E, T> | SuiteCase<R, E, AbstractSpec<R, E, T>>;

export function suite<R, E, T>(
  label: string,
  specs: Managed<R, E, ReadonlyArray<AbstractSpec<R, E, T>>>,
  exec: Option<ExecutionStrategy>
): AbstractSpec<R, E, T> {
  return new SuiteCase(label, specs, exec);
}

export function test<R, E, T>(label: string, test: IO<R, E, T>): AbstractSpec<R, E, T> {
  return new TestCase(label, test);
}

export function fold_<R, E, T, Z>(
  spec: AbstractSpec<R, E, T>,
  f: (_: SpecCase<R, E, T, Z>) => Z
): Z {
  return matchTag_(spec, {
    Suite: ({ label, specs, exec }) =>
      f(
        new SuiteCase(
          label,
          M.map_(
            specs,
            A.map((spec) => fold_(spec, f))
          ),
          exec
        )
      ),
    Test: f
  });
}

export function countTests_<R, E, T>(
  spec: AbstractSpec<R, E, T>,
  f: (t: T) => boolean
): Managed<R, E, number> {
  return fold_(
    spec,
    matchTag({
      Suite: ({ specs }) => M.chain_(specs, flow(M.foreach(identity), M.map(A.sum))),
      Test: ({ test }) => I.toManaged_(I.map_(test, (t) => (f(t) ? 1 : 0)))
    })
  );
}

export function filterLabels_<R, E, T>(
  spec: AbstractSpec<R, E, T>,
  f: (label: string) => boolean
): Option<AbstractSpec<R, E, T>> {
  return matchTag_(spec, {
    Suite: (s) =>
      f(s.label)
        ? O.some(s)
        : O.some(
            suite(
              s.label,
              M.map_(
                s.specs,
                A.chain((spec) =>
                  O.fold_(
                    filterLabels_(spec, f),
                    () => A.empty<AbstractSpec<R, E, T>>(),
                    (spec) => [spec]
                  )
                )
              ),
              s.exec
            )
          ),
    Test: (t) => (f(t.label) ? O.some(t) : O.none())
  });
}

export function foldM_<R, E, T, R1, E1, Z>(
  spec: AbstractSpec<R, E, T>,
  f: (_: SpecCase<R, E, T, Z>) => Managed<R1, E1, Z>,
  defExec: ExecutionStrategy
): Managed<R & R1, E1, Z> {
  return matchTag_(spec, {
    Suite: ({ label, specs, exec }) =>
      M.foldCauseM_(
        specs,
        (c) => f(new SuiteCase(label, M.halt(c), exec)),
        flow(
          M.foreachExec(O.getOrElse_(exec, () => defExec))((spec) =>
            M.release(foldM_(spec, f, defExec))
          ),
          M.chain((z) => f(new SuiteCase(label, M.succeed(z), exec)))
        )
      ),
    Test: f
  });
}

export function foreachExec_<R, E, T, R1, E1, A>(
  spec: AbstractSpec<R, E, T>,
  onFailure: (c: Cause<E>) => IO<R1, E1, A>,
  onSuccess: (t: T) => IO<R1, E1, A>,
  defExec: ExecutionStrategy
): Managed<R & R1, never, AbstractSpec<R & R1, E1, A>> {
  return foldM_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) =>
        M.foldCause_(
          specs,
          (e) => test(label, onFailure(e)),
          (t) => suite(label, M.succeed(t), exec)
        ),
      Test: (t) =>
        I.toManaged_(
          I.foldCause_(
            t.test,
            (e) => test(t.label, onFailure(e)),
            (a) => test(t.label, onSuccess(a))
          )
        )
    }),
    defExec
  );
}

export function foreachExec<E, T, R1, E1, A>(
  onFailure: (c: Cause<E>) => IO<R1, E1, A>,
  onSuccess: (t: T) => IO<R1, E1, A>,
  defExec: ExecutionStrategy
): <R>(spec: AbstractSpec<R, E, T>) => Managed<R & R1, never, AbstractSpec<R & R1, E1, A>> {
  return (spec) => foreachExec_(spec, onFailure, onSuccess, defExec);
}

export function transform_<R, E, T, R1, E1, T1>(
  spec: AbstractSpec<R, E, T>,
  f: (
    _: SpecCase<R, E, T, AbstractSpec<R1, E1, T1>>
  ) => SpecCase<R1, E1, T1, AbstractSpec<R1, E1, T1>>
): AbstractSpec<R1, E1, T1> {
  return matchTag_(spec, {
    Suite: ({ label, specs, exec }) =>
      f(
        new SuiteCase(
          label,
          M.map_(
            specs,
            A.map((spec) => transform_(spec, f))
          ),
          exec
        )
      ),
    Test: f
  });
}

export function mapError_<R, E, T, E1>(
  spec: AbstractSpec<R, E, T>,
  f: (e: E) => E1
): AbstractSpec<R, E1, T> {
  return transform_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) => new SuiteCase(label, M.mapError_(specs, f), exec),
      Test: ({ label, test }) => new TestCase(label, I.mapError_(test, f))
    })
  );
}

export function gives_<R, E, T, R0>(
  spec: AbstractSpec<R, E, T>,
  f: (r0: R0) => R
): AbstractSpec<R0, E, T> {
  return transform_(
    spec,
    matchTag({
      Suite: ({ label, specs, exec }) => new SuiteCase(label, M.gives_(specs, f), exec),
      Test: ({ label, test }) => new TestCase(label, I.gives_(test, f))
    })
  );
}

export function gives<R0, R>(
  f: (r0: R0) => R
): <E, T>(spec: AbstractSpec<R, E, T>) => AbstractSpec<R0, E, T> {
  return (spec) => gives_(spec, f);
}

export function giveAll_<R, E, T>(spec: AbstractSpec<R, E, T>, r: R): AbstractSpec<unknown, E, T> {
  return gives_(spec, () => r);
}

export function giveAll<R>(
  r: R
): <E, T>(spec: AbstractSpec<R, E, T>) => AbstractSpec<unknown, E, T> {
  return (spec) => giveAll_(spec, r);
}

export function giveLayer<R1, E1, A1>(
  layer: Layer<R1, E1, A1>
): <R, E, T>(spec: AbstractSpec<R & A1, E, T>) => AbstractSpec<R & R1, E | E1, T> {
  return (spec) =>
    transform_(
      spec,
      matchTag({
        Suite: ({ label, specs, exec }) => new SuiteCase(label, M.giveLayer(layer)(specs), exec),
        Test: ({ label, test }) => new TestCase(label, I.giveLayer(layer)(test))
      })
    );
}

export function giveSomeLayer<R1, E1, A1>(
  layer: Layer<R1, E1, A1>
): <R, E, T>(spec: AbstractSpec<R & A1, E, T>) => AbstractSpec<R & R1, E | E1, T> {
  return <R, E, T>(spec: AbstractSpec<R & A1, E, T>) =>
    giveLayer(layer["+++"](L.identity<R>()))(spec);
}

export function giveSomeLayerShared<R1, E1, A1>(
  layer: Layer<R1, E1, A1>
): <R, E, T>(spec: AbstractSpec<R & A1, E, T>) => AbstractSpec<R & R1, E | E1, T> {
  return <R, E, T>(spec: AbstractSpec<R & A1, E, T>) =>
    matchTag_(spec, {
      Suite: ({ label, specs, exec }) =>
        suite(
          label,
          pipe(
            L.memoize(layer),
            M.chain((layer) => M.map_(specs, A.map(giveSomeLayer(layer)))),
            M.giveSomeLayer(layer)
          ),
          exec
        ),
      Test: (t) => test(t.label, I.giveSomeLayer(layer)(t.test))
    });
}

export function execute<R, E, T>(
  spec: AbstractSpec<R, E, T>,
  defExec: ExecutionStrategy
): Managed<R, never, AbstractSpec<unknown, E, T>> {
  return M.asksManaged((r: R) => pipe(spec, giveAll(r), foreachExec(I.halt, I.succeed, defExec)));
}
