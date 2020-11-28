import type { Show } from "../Show";
import { fromShow } from "../Show";
import { fold } from "./destructors";
import type { These } from "./model";

/*
 * -------------------------------------------
 * Show These
 * -------------------------------------------
 */

export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<These<E, A>> {
  return fromShow(
    fold(
      (l) => `Left<${SE.show(l)}>`,
      (r) => `Right<${SA.show(r)}>`,
      (l, r) => `Both<${SE.show(l)}, ${SA.show(r)}>`
    )
  );
}
