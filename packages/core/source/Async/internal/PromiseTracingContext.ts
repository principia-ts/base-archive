import * as A from "../../Array";
import type { Exit } from "../exit";
import * as Ex from "../exit";

export class PromiseTracingContext {
   #running = new Set<Promise<any>>();

   traced<A>(promise: () => Promise<A>) {
      return async () => {
         const p = promise();
         this.#running.add(p);

         try {
            const a = await p;
            this.#running.delete(p);
            return Promise.resolve(a);
         } catch (e) {
            this.#running.delete(p);
            return Promise.reject(e);
         }
      };
   }

   async wait(): Promise<Exit<any, any>[]> {
      const t = await Promise.all(
         A.map_(Array.from(this.#running), (p) => p.then((a) => Ex.done(a)).catch((e) => Promise.resolve(e)))
      );
      return await new Promise((r) => {
         setTimeout(() => {
            r(t);
         }, 0);
      });
   }

   clear() {
      this.#running.clear();
   }
}

export const defaultTracingContext = new PromiseTracingContext();
