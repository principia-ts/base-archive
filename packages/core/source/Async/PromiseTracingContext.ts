import type { AsyncExit } from "./AsyncExit";
import { success } from "./AsyncExit";

export class PromiseTracingContext {
   private running = new Set<Promise<any>>();

   constructor() {
      this.traced = this.traced.bind(this);
      this.wait = this.wait.bind(this);
      this.clear = this.clear.bind(this);
   }

   traced<A>(promise: () => Promise<A>) {
      return async () => {
         const p = promise();
         this.running.add(p);

         try {
            const a = await p;
            this.running.delete(p);
            return Promise.resolve(a);
         } catch (e) {
            this.running.delete(p);
            return Promise.reject(e);
         }
      };
   }

   async wait(): Promise<AsyncExit<any, any>[]> {
      const t = await Promise.all(
         Array.from(this.running).map((p) => p.then((a) => success(a)).catch((e) => Promise.resolve(e)))
      );
      return await new Promise((r) => {
         setTimeout(() => {
            r(t);
         }, 0);
      });
   }

   clear() {
      this.running.clear();
   }
}

export const defaultPromiseTracingContext = new PromiseTracingContext();
