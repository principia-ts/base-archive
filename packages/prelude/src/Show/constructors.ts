import type { Show } from "./model";

export function fromShow<A>(show: (a: A) => string): Show<A> {
  return {
    show
  };
}
