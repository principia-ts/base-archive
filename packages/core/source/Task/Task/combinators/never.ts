import { suspend, total } from "../_core";
import { asyncInterrupt } from "./interrupt";

/**
 * Returns a `Task` that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never = suspend(() =>
   asyncInterrupt<unknown, never, never>(() => {
      const interval = setInterval(() => {
         //
      }, 60000);
      return total(() => {
         clearInterval(interval);
      });
   })
);
