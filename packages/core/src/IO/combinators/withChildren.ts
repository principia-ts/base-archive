import type { RuntimeFiber } from "../Fiber";
import { map_ } from "../functor";
import type { IO, UIO } from "../model";
import { chain_ } from "../monad";
import { track } from "../Supervisor";
import { descriptor } from "./core";
import { supervised_ } from "./supervised";

export function withChildren<R, E, A>(
  get: (_: UIO<ReadonlyArray<RuntimeFiber<any, any>>>) => IO<R, E, A>
): IO<R, E, A> {
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
