import type { RuntimeFiber } from "../../Fiber";
import { track } from "../../Supervisor";
import { descriptor } from "../core-combinators";
import { map_ } from "../functor";
import type { IO, Task } from "../model";
import { chain_ } from "../monad";
import { supervised_ } from "./supervised";

export const withChildren = <R, E, A>(get: (_: IO<ReadonlyArray<RuntimeFiber<any, any>>>) => Task<R, E, A>) =>
   chain_(track, (supervisor) =>
      supervised_(
         get(chain_(supervisor.value, (children) => map_(descriptor(), (d) => children.filter((_) => _.id !== d.id)))),
         supervisor
      )
   );
