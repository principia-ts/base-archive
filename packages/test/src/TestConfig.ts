import type { Has } from "@principia/base/data/Has";
import type { Layer } from "@principia/io/Layer";

import { tag } from "@principia/base/data/Has";
import * as I from "@principia/io/IO";
import * as L from "@principia/io/Layer";

export interface TestConfig {
  readonly repeats: number;
  readonly retries: number;
  readonly samples: number;
  readonly shrinks: number;
}

export const TestConfig = tag<TestConfig>();

export function live(_: TestConfig): Layer<unknown, never, Has<TestConfig>> {
  return L.pure(TestConfig)(_);
}

export const { repeats, retries, samples, shrinks } = I.deriveLifted(TestConfig)(
  [],
  [],
  ["repeats", "retries", "samples", "shrinks"]
);
