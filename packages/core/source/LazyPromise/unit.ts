import type { LazyPromise } from "./model";

/*
 * -------------------------------------------
 * LazyPromise Unit
 * -------------------------------------------
 */

export const unit = (): LazyPromise<void> => () => Promise.resolve(undefined);
