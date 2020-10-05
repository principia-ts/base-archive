import type * as HKT from "../HKT";
import { Monad } from "../Monad";
import { AccessF } from "./AccessF";
import { AccessMF } from "./AccessMF";
import { ProvideAllF } from "./ProvideAllF";
import { ProvideF } from "./ProvideF";
import { ProvideSomeF } from "./ProvideSomeF";

export interface MonadEnv<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
   readonly access: AccessF<F, C>;
   readonly accessM: AccessMF<F, C>;
   readonly provideAll: ProvideAllF<F, C>;
   readonly provideSome: ProvideSomeF<F, C>;
   readonly provide: ProvideF<F, C>;
}
