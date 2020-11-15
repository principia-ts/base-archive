import * as L from "../../../List";
import * as M from "../../Managed";
import * as T from "../../Task";
import { Transducer } from "./model";

export function map_<R, E, I, O, O1>(fa: Transducer<R, E, I, O>, f: (o: O) => O1): Transducer<R, E, I, O1> {
   return new Transducer(M.map_(fa.push, (push) => (input) => T.map_(push(input), L.map(f))));
}

export function map<O, P>(f: (o: O) => P): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, P> {
   return (fa) => map_(fa, f);
}

export function mapChunks_<R, E, I, O, O1>(
   fa: Transducer<R, E, I, O>,
   f: (chunks: L.List<O>) => L.List<O1>
): Transducer<R, E, I, O1> {
   return new Transducer(M.map_(fa.push, (push) => (input) => T.map_(push(input), f)));
}

export function mapChunks<O, O1>(
   f: (chunks: L.List<O>) => L.List<O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R, E, I, O1> {
   return (fa) => mapChunks_(fa, f);
}

export function mapChunksM_<R, E, I, O, R1, E1, O1>(
   fa: Transducer<R, E, I, O>,
   f: (chunk: L.List<O>) => T.Task<R1, E1, L.List<O1>>
): Transducer<R & R1, E | E1, I, O1> {
   return new Transducer(M.map_(fa.push, (push) => (input) => T.chain_(push(input), f)));
}

export function mapChunksM<O, R1, E1, O1>(
   f: (chunk: L.List<O>) => T.Task<R1, E1, L.List<O1>>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
   return (fa) => mapChunksM_(fa, f);
}

export function mapM_<R, E, I, O, R1, E1, O1>(
   fa: Transducer<R, E, I, O>,
   f: (o: O) => T.Task<R1, E1, O1>
): Transducer<R & R1, E | E1, I, O1> {
   return new Transducer(M.map_(fa.push, (push) => (input) => T.chain_(push(input), L.foreachTask(f))));
}

export function mapM<O, R1, E1, O1>(
   f: (o: O) => T.Task<R1, E1, O1>
): <R, E, I>(fa: Transducer<R, E, I, O>) => Transducer<R & R1, E | E1, I, O1> {
   return (fa) => mapM_(fa, f);
}
