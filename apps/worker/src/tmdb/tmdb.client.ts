import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  overview: string;
  poster_path: string | null;
}

@Injectable()
export class TmdbClient {
  private readonly logger = new Logger(TmdbClient.name);
  private readonly axios: AxiosInstance | null;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("TMDB_API_KEY");
    if (!apiKey) {
      this.logger.warn("TMDB_API_KEY not set — movie metadata fetching disabled");
      this.axios = null;
      return;
    }

    this.axios = axios.create({
      baseURL: "https://api.themoviedb.org/3",
      timeout: 10_000,
      params: { api_key: apiKey, language: "en-US" },
      validateStatus: (status) => status < 500,
    });
  }

  get enabled(): boolean {
    return this.axios !== null;
  }

  async getMovie(tmdbId: string): Promise<TmdbMovie | null> {
    if (!this.axios) return null;

    const response = await this.axios.get<TmdbMovie>(`/movie/${tmdbId}`);
    if (response.status === 404) {
      this.logger.warn(`TMDB movie ${tmdbId} not found`);
      return null;
    }
    if (response.status !== 200) {
      throw new Error(`TMDB /movie/${tmdbId} returned ${response.status}`);
    }
    return response.data;
  }
}
