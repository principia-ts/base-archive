import type { Show } from "./model";

export const any: Show<any> = {
   show: (a) => JSON.stringify(a)
};

export const string: Show<string> = any;

export const number: Show<number> = any;

export const boolean: Show<boolean> = any;
