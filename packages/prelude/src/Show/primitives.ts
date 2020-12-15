import type { Show } from "./model";

export const any: Show<any> = {
  show: (a) =>
    "toString" in a ? a.toString() : typeof a === "function" ? a.name : JSON.stringify(a)
};

export const string: Show<string> = any;

export const number: Show<number> = any;

export const boolean: Show<boolean> = any;
