import type { Show } from "./model";

export function getStructShow<O extends Readonly<Record<string, any>>>(
   shows: {
      [K in keyof O]: Show<O[K]>;
   }
): Show<O> {
   return {
      show: (a) =>
         `{ ${Object.keys(shows)
            .map((k) => `${k}: ${shows[k].show(a[k])}`)
            .join(", ")} }`
   };
}

export function getTupleShow<T extends ReadonlyArray<Show<any>>>(
   ...shows: T
): Show<
   {
      [K in keyof T]: T[K] extends Show<infer A> ? A : never;
   }
> {
   return {
      show: (t) => `[${t.map((a, i) => shows[i].show(a)).join(", ")}]`
   };
}
