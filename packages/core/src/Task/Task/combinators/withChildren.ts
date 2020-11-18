import type { RuntimeFiber } from "../../Fiber";
import { track } from "../../Supervisor";
import { descriptor } from "./core";
import { map_ } from "../functor";
import type { IO, Task } from "../model";
import { chain_ } from "../monad";
import { supervised_ } from "./supervised";

export function withChildren<R, E, A>(
  get: (_: IO<ReadonlyArray<RuntimeFiber<any, any>>>) => Task<R, E, A>
): Task<R, E, A> {
  return chain_(track, (supervisor) =>
    supervised_(
      get(
        chain_(supervisor.value, (children) =>
          map_(descriptor(), (d) => children.filter((_) => _.id !== d.id))
        )
      ),
      supervisor
    )
  );
}
