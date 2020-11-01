import type { Show } from "./model";

export const fromShow = <A>(show: (a: A) => string): Show<A> => ({
   show
});
