import { pipe, tuple } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { HasClock } from "../../Clock";
import { currentTime } from "../../Clock";
import type { XPromise } from "../../XPromise";
import * as XP from "../../XPromise";
import * as XRM from "../../XRefM";
import * as T from "../_core";
import type { AIO, EIO, RIO } from "../model";
import { uninterruptibleMask } from "./interrupt";
import { to } from "./to";

const _compute = <R, E, A>(fa: AIO<R, E, A>, ttl: number, start: number) =>
  pipe(
    T.do,
    T.bindS("p", () => XP.make<E, A>()),
    T.tap(({ p }) => to(p)(fa)),
    T.map(({ p }) => O.some(tuple(start + ttl, p)))
  );

const _get = <R, E, A>(
  fa: AIO<R, E, A>,
  ttl: number,
  cache: XRM.RefM<Option<readonly [number, XPromise<E, A>]>>
) =>
  uninterruptibleMask(({ restore }) =>
    pipe(
      currentTime,
      T.chain((time) =>
        pipe(
          cache,
          XRM.updateSomeAndGet((o) =>
            pipe(
              o,
              O.fold(
                () => O.some(_compute(fa, ttl, time)),
                ([end]) =>
                  end - time <= 0
                    ? O.some(_compute(fa, ttl, time))
                    : O.none<AIO<R, never, Option<readonly [number, XP.XPromise<E, A>]>>>()
              )
            )
          ),
          T.chain((a) => (a._tag === "None" ? T.die("bug") : restore(XP.await(a.value[1]))))
        )
      )
    )
  );

/**
 * ```haskell
 * cached_ :: (AIO r e a, Number) -> AIO (r & HasClock) _ (t ^ _ e a)
 * ```
 *
 * Returns an AIO that, if evaluated, will return the cached result of
 * this AIO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached_<R, E, A>(
  fa: AIO<R, E, A>,
  timeToLive: number
): RIO<R & HasClock, EIO<E, A>> {
  return pipe(
    T.do,
    T.bindS("r", () => T.ask<R & HasClock>()),
    T.bindS("cache", () => XRM.make<Option<readonly [number, XPromise<E, A>]>>(O.none())),
    T.map(({ cache, r }) => T.giveAll(r)(_get(fa, timeToLive, cache)))
  );
}

/**
 * ```haskell
 * cached :: Number -> AIO r e a -> AIO (r & HasClock) _ (AIO _ e a)
 * ```
 *
 * Returns an AIO that, if evaluated, will return the cached result of
 * this AIO. Cached results will expire after `timeToLive` duration.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function cached(
  timeToLive: number
): <R, E, A>(fa: T.AIO<R, E, A>) => RIO<R & HasClock, EIO<E, A>> {
  return <R, E, A>(fa: AIO<R, E, A>) => cached_(fa, timeToLive);
}
