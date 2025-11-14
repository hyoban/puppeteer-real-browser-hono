import { LRUCache } from "lru-cache";

interface CacheOptions {
  max?: number;
  ttl?: number;
}

export class ResponseCache {
  private cache: LRUCache<string, string[]>;

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache<string, string[]>({
      max: options.max || 100,
      ttl: options.ttl || 1000 * 60 * 5,
    });
  }

  private generateKey(
    url: string | string[],
    options: Record<string, any>
  ): string {
    const urlKey = Array.isArray(url) ? url.sort().join(",") : url;
    const optionsKey = JSON.stringify(options);
    return `${urlKey}:${optionsKey}`;
  }

  get(
    url: string | string[],
    options: Record<string, any>
  ): string[] | undefined {
    const key = this.generateKey(url, options);
    return this.cache.get(key);
  }

  set(
    url: string | string[],
    options: Record<string, any>,
    value: string[]
  ): void {
    const key = this.generateKey(url, options);
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }
}

export const responseCache = new ResponseCache();
