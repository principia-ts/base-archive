import type { InspectOptions } from "util";
import { inspect } from "util";

import type { Has } from "../../Has";
import { tag } from "../../Has";
import type { Layer } from "../../Layer";
import * as L from "../../Layer";
import * as I from "../index";

export interface Console {
  readonly putStrLn: (line: string) => I.UIO<void>;
  readonly putStrLnErr: (line: string) => I.UIO<void>;
  readonly putStrLnDebug: (line: string) => I.UIO<void>;
}

export const Console = tag<Console>();

export class NodeConsole implements Console {
  putStrLn(...data: any[]) {
    return I.total(() => {
      console.log(...data);
    });
  }
  putStrLnErr(...data: any[]) {
    return I.total(() => {
      console.error(...data);
    });
  }
  putStrLnDebug(...data: any[]) {
    return I.total(() => {
      console.debug(...data);
    });
  }

  time(label?: string) {
    return I.total(() => {
      console.time(label);
    });
  }
  timeEnd(label?: string) {
    return I.total(() => {
      console.timeEnd(label);
    });
  }
  timeLog(label?: string) {
    return I.total(() => {
      console.timeLog(label);
    });
  }

  count(label?: string) {
    return I.total(() => {
      console.count(label);
    });
  }
  countReset(label?: string) {
    return I.total(() => {
      console.countReset(label);
    });
  }

  inspect(object: any, options?: InspectOptions) {
    return I.total(() => {
      console.log(inspect(object, options ?? {}));
    });
  }

  static live: Layer<unknown, never, Has<Console>> = L.pure(Console)(new NodeConsole());
}
