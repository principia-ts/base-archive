import type { Chunk } from "../../Chunk";
import type * as Ex from "../../Exit";
import type * as Queue from "../../Queue";
import type { Stream } from "../core";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../../Chunk";
import * as I from "../../IO";
import * as M from "../../Managed";
import * as Map from "@principia/base/data/Map";
import * as P from "../../Promise";
import { distributedWithDynamic_ } from "./distributedWithDynamic";

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith<O>(
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): <R, E>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide);
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return pipe(
    P.make<never, (_: O) => I.UIO<(_: symbol) => boolean>>(),
    M.fromEffect,
    M.chain((prom) =>
      pipe(
        distributedWithDynamic_(
          stream,
          maximumLag,
          (o) => I.flatMap_(P.await(prom), (_) => _(o)),
          (_) => I.unit()
        ),
        M.chain((next) =>
          pipe(
            I.collectAll(
              pipe(
                C.range(0, n),
                C.map((id) => I.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            I.flatMap((entries) => {
              const [mappings, queues] = C.reduceRight_(
                entries,
                [
                  Map.empty<symbol, number>(),
                  C.empty<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>()
                ] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.unsafeInsertAt_(mappings, mapping[0], mapping[1]),
                  C.append_(queues, queue)
                ]
              );
              return pipe(
                P.succeed_(prom, (o: O) =>
                  I.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key) as number))
                ),
                I.as(() => queues)
              );
            }),
            M.fromEffect
          )
        )
      )
    )
  );
}
