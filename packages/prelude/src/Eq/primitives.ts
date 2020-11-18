import type { Eq } from "./model";

export const any: Eq<any> = {
  equals_: () => true,
  equals: () => () => true
};

export const strict: Eq<unknown> = {
  equals_: (x, y) => x === y,
  equals: (y) => (x) => x === y
};

export const string: Eq<string> = strict;

export const number: Eq<number> = strict;

export const boolean: Eq<boolean> = strict;

export const date: Eq<Date> = {
  equals_: (x, y) => x.valueOf() === y.valueOf(),
  equals: (y) => (x) => x.valueOf() === y.valueOf()
};
