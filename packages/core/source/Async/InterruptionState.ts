export interface RemoveListener {
   (): void;
}

export class InterruptionState {
   private isInterrupted = false;
   readonly listeners = new Set<() => void>();

   listen(f: () => void): RemoveListener {
      this.listeners.add(f);
      return () => {
         this.listeners.delete(f);
      };
   }

   get interrupted() {
      return this.isInterrupted;
   }

   interrupt() {
      this.isInterrupted = true;
      this.listeners.forEach((f) => {
         f();
      });
   }
}
