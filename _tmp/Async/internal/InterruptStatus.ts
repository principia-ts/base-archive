export class InterruptStatus {
   constructor(readonly isInterruptible: boolean) {}

   get isUninterruptible(): boolean {
      return !this.isInterruptible;
   }

   get toBoolean(): boolean {
      return this.isInterruptible;
   }
}
