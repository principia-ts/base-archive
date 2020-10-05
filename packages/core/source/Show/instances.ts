import type { Show } from "./Show";

const showAny: Show<any> = {
   show: (a) => JSON.stringify(a)
};

export const showString: Show<string> = showAny;

export const showNumber: Show<number> = showAny;

export const showBoolean: Show<boolean> = showAny;

export const getStructShow = <O extends Readonly<Record<string, any>>>(
   shows: { [K in keyof O]: Show<O[K]> }
): Show<O> => ({
   show: (a) =>
      `{ ${Object.keys(shows)
         .map((k) => `${k}: ${shows[k].show(a[k])}`)
         .join(", ")} }`
});

export const getTupleShow = <T extends ReadonlyArray<Show<any>>>(
   ...shows: T
): Show<{ [K in keyof T]: T[K] extends Show<infer A> ? A : never }> => ({
   show: (t) => `[${t.map((a, i) => shows[i].show(a)).join(", ")}]`
});
