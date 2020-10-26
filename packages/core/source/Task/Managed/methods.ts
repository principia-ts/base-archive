import * as M from "./core";

export const pure = M.succeed;

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
// export const bind: P.BindFn<[URI], V> = (fa) => (f) => M.chain_(fa, f);

// export const ap_: P.ApFn_<[URI], V> = (fab, fa) => M.chain_(fa, (a) => M.map_(fab, (ab) => ab(a)));

// export const ap: P.ApFn<[URI], V> = (fa) => (fab) => ap_(fab, fa);

// export const apFirst: P.ApFirstFn<[URI], V> = (fb) => (fa) => M.chain_(fa, (a) => M.map_(fb, () => a));

// export const apSecond: P.ApSecondFn<[URI], V> = (fb) => (fa) => M.chain_(fa, () => fb);

// export const alt_: P.AltFn_<[URI], V> = (fa, that) => M.chain_(fa, () => that());

// export const alt: P.AltFn<[URI], V> = (that) => (fa) => alt_(fa, that);

// export const apS: P.ApSFn<[URI], V> = (name, fb) =>
//    flow(
//       M.map((a) => (b: InferSuccess<typeof fb>) => bind_(a, name, b)),
//       ap(fb)
//    );
