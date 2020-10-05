/*
 * export const locally = <A>(value: A) => <R, E, B>(use: T.Effect<R, E, B>) => (
 *    fiberRef: FiberRef<A>
 * ): T.Effect<R, E, B> =>
 *    pipe(
 *       get(fiberRef),
 *       T.chain((oldValue) =>
 *          T._bracket(
 *             set(value)(fiberRef),
 *             () => use,
 *             () => set(oldValue)(fiberRef)
 *          )
 *       )
 *    );
 */
