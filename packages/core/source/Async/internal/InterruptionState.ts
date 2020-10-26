export class InterruptionState {
   private interrupted = false;
   private listeners: Set<() => void> = new Set();

   listen = (f: () => void): (() => void) => {
      this.listeners.add(f);
      return () => {
         this.listeners.delete(f);
      };
   };

   get isInterrupted(): boolean {
      return this.interrupted;
   }

   interrupt() {
      this.interrupted = true;
      this.listeners.forEach((f) => f());
   }
}
