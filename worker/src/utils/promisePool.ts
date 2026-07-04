export class PromisePool {
  private activeCount = 0;
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  get active() {
    return this.activeCount;
  }

  get isFull() {
    return this.activeCount >= this.limit;
  }

  run(task: () => Promise<void>): void {
    if (this.isFull) {
      throw new Error('PromisePool is full');
    }

    this.activeCount++;
    task().finally(() => {
      this.activeCount--;
    });
  }
}

export default PromisePool;
