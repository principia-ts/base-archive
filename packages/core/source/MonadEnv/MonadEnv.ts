import type * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { AccessF } from "./AccessF";
import type { AccessMF } from "./AccessMF";
import type { ProvideAllF } from "./ProvideAllF";
import type { ProvideF } from "./ProvideF";
import type { ProvideSomeF } from "./ProvideSomeF";

export interface MonadEnv<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
   readonly access: AccessF<F, C>;
   readonly accessM: AccessMF<F, C>;
   readonly provideAll: ProvideAllF<F, C>;
   readonly provideSome: ProvideSomeF<F, C>;
   readonly provide: ProvideF<F, C>;
}
