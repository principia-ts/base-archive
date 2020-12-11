import type { Show } from "@principia/prelude";
import { fromShow } from "@principia/prelude";

import type { AssertionM } from "../AssertionM";

export interface RenderAssertionM {
  readonly _tag: "AssertionM";
  readonly assertion: AssertionM<any>;
  readonly toString: () => string;
}

export interface RenderValue {
  readonly _tag: "Value";
  readonly value: any;
  readonly show: Show<any>;
  readonly toString: () => string;
}

export type RenderParam = RenderAssertionM | RenderValue;

export function assertionParam<A>(assertion: AssertionM<A>): RenderAssertionM {
  return {
    _tag: "AssertionM",
    assertion,
    toString() {
      return this.assertion.toString();
    }
  };
}

const showAny = fromShow((_: any) => (_.toString ? _.toString() : `${_}`));

export function valueParam<A>(value: A, show?: Show<A>): RenderValue {
  return {
    _tag: "Value",
    value,
    show: show ?? showAny,
    toString() {
      return this.show.show(this.value);
    }
  };
}
