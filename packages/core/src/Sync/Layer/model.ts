import { AtomicReference } from "../../Utils/support/AtomicReference";
import * as Sy from "./_internal";

export abstract class SyncLayer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol());

  readonly _R!: (_: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  setKey(key: PropertyKey) {
    this.hash.set(key);
    return this;
  }

  abstract scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R, E, A>>;

  build(): Sy.Sync<R, E, A> {
    const scope = () => this.scope();
    return Sy.gen(function* (_) {
      const memo = yield* _(Sy.total((): SyncMemoMap => new Map()));
      const scoped = yield* _(scope());
      return yield* _(scoped(memo));
    });
  }
}

export type SyncMemoMap = Map<PropertyKey, any>;

export enum SyncLayerInstructionTag {
  FromSync = "FromSync",
  Fresh = "Fresh",
  Suspend = "Suspend",
  Both = "Both",
  Using = "Using",
  From = "From",
  All = "All"
}
