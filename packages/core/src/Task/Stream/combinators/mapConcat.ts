import * as A from "../../../Array";
import * as E from "../../../Either";
import { flow, identity, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Exit } from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import * as M from "../../Managed";
import * as RM from "../../Managed/ReleaseMap";
import * as Semaphore from "../../Semaphore";
import * as T from "../../Task";
import * as XP from "../../XPromise";
import * as XQ from "../../XQueue";
import * as XR from "../../XRef";
import { fromArray, fromTask, managed, repeatTaskChunkOption } from "../constructors";
import { foreachManaged } from "../destructors";
import { mapChunks_, mapM } from "../functor";
import * as BPull from "../internal/BufferedPull";
import * as Pull from "../internal/Pull";
import * as Take from "../internal/Take";
import type { IO, RIO, Stream } from "../model";
import { Chain } from "../model";

export const mapConcat_ = <R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => Iterable<B>) =>
   mapChunks_(stream, (chunks) => A.chain_(chunks, (a) => Array.from(f(a))));

export const mapConcat = <A, B>(f: (a: A) => Iterable<B>) => <R, E>(stream: Stream<R, E, A>) => mapConcat_(stream, f);

export const mapConcatChunk_ = <R, E, A, B>(stream: Stream<R, E, A>, f: (a: A) => ReadonlyArray<B>) =>
   mapChunks_(stream, (chunks) => A.chain_(chunks, f));

export const mapConcatChunk = <A, B>(f: (a: A) => ReadonlyArray<B>) => <R, E>(stream: Stream<R, E, A>) =>
   mapConcatChunk_(stream, f);

export const mapConcatChunkM_ = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>
) => pipe(stream, mapM(f), mapConcatChunk(identity));

export const mapConcatChunkM = <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, ReadonlyArray<B>>) => <R, E>(
   stream: Stream<R, E, A>
) => mapConcatChunkM_(stream, f);

export const mapConcatM_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Task<R1, E1, Iterable<B>>) =>
   pipe(
      stream,
      mapConcatChunkM((a) => T.map_(f(a), (_) => Array.from(_)))
   );
