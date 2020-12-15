import type { Show } from "@principia/prelude/Show";
import { any } from "@principia/prelude/Show";

export interface GenFailureDetails {
  readonly initialInput: any;
  readonly shrunkenInput: any;
  readonly iterations: number;
  readonly show: Show<any>["show"];
}

export function GenFailureDetails<A>(
  initialInput: A,
  shrunkenInput: A,
  iterations: number,
  show?: Show<A>
): GenFailureDetails {
  return {
    initialInput,
    shrunkenInput,
    iterations,
    show: show ? show.show : any.show
  };
}
