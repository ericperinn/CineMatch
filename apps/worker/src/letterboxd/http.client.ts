import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosResponse } from "axios";

type Resolver = () => void;

/**
 * Concurrency-limited HTTP client for Letterboxd.
 *
 * Etiquette enforced here, never relax without revisiting docs/06-letterboxd.md:
 *  - Identifying User-Agent
 *  - Hard cap of N concurrent requests across the whole worker
 *  - Soft serialization: at most 1 request per second per username
 *  - Exponential backoff on 429/503
 */
@Injectable()
export class LetterboxdHttpClient {
  private readonly logger = new Logger(LetterboxdHttpClient.name);
  private readonly axios: AxiosInstance;
  private readonly globalLimit: number;
  private inFlight = 0;
  private readonly waiters: Resolver[] = [];
  private readonly lastRequestPerUser = new Map<string, number>();
  private readonly MIN_INTERVAL_MS = 1000;

  constructor(config: ConfigService) {
    const userAgent = config.get<string>(
      "LETTERBOXD_USER_AGENT",
      "CineMatch/0.1 (+contact@cinematch.example)",
    );
    this.globalLimit = parseInt(config.get<string>("LETTERBOXD_GLOBAL_CONCURRENCY", "5"), 10);

    this.axios = axios.create({
      baseURL: "https://letterboxd.com",
      timeout: 15_000,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * GET a Letterboxd page or RSS feed, enforcing etiquette.
   * Pass `userKey` to serialize requests per username (defaults to global).
   */
  async get<T = string>(path: string, userKey = "__global__"): Promise<AxiosResponse<T>> {
    await this.acquireGlobalSlot();
    try {
      await this.respectPerUserInterval(userKey);
      return await this.fetchWithRetry<T>(path);
    } finally {
      this.releaseGlobalSlot();
    }
  }

  private async fetchWithRetry<T>(path: string, attempt = 0): Promise<AxiosResponse<T>> {
    const response = await this.axios.get<T>(path);

    if (response.status === 429 || response.status === 503) {
      if (attempt >= 4) {
        throw new Error(`Letterboxd ${path} returned ${response.status} after ${attempt} retries`);
      }
      const backoffMs = Math.min(60_000, 2 ** attempt * 1000);
      this.logger.warn(`Letterboxd ${path} → ${response.status}; backing off ${backoffMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return this.fetchWithRetry<T>(path, attempt + 1);
    }

    return response;
  }

  private async acquireGlobalSlot(): Promise<void> {
    if (this.inFlight < this.globalLimit) {
      this.inFlight++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.inFlight++;
  }

  private releaseGlobalSlot(): void {
    this.inFlight--;
    const next = this.waiters.shift();
    if (next) next();
  }

  private async respectPerUserInterval(userKey: string): Promise<void> {
    const last = this.lastRequestPerUser.get(userKey) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < this.MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_INTERVAL_MS - elapsed));
    }
    this.lastRequestPerUser.set(userKey, Date.now());
  }
}
