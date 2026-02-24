// Sync queue for offline-first sync strategy
export interface SyncItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
}

export class SyncQueue {
  private queue: SyncItem[] = [];

  async add(
    action: SyncItem['action'],
    resource: string,
    data: Record<string, any>
  ): Promise<void> {
    const item: SyncItem = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      resource,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(item);
    // Stub: Persist to SQLite in production
  }

  async process(): Promise<void> {
    // Stub: Process items in queue
    for (const item of this.queue) {
      try {
        // Attempt to sync with server
        // Stub API call here
      } catch (error) {
        item.retries++;
        if (item.retries > 3) {
          // Remove after 3 retries
          this.queue = this.queue.filter((i) => i.id !== item.id);
        }
      }
    }
  }

  getQueue(): SyncItem[] {
    return [...this.queue];
  }
}
