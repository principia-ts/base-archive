import type { Cause } from "./model";

export const empty: Cause<never> = {
  _tag: "Empty"
};
