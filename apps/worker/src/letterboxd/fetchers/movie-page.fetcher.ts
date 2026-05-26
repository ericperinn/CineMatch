import { Injectable, Logger } from "@nestjs/common";
import * as cheerio from "cheerio";
import { LetterboxdHttpClient } from "../http.client";

export interface MoviePageInfo {
  tmdbId: string | null;
  title: string | null;
  year: number | null;
}

@Injectable()
export class MoviePageFetcher {
  private readonly logger = new Logger(MoviePageFetcher.name);

  constructor(private readonly http: LetterboxdHttpClient) {}

  /**
   * Resolve a Letterboxd film slug to its TMDB id by scraping the public
   * film page. The TMDB id lives in an anchor like:
   *   <a href="https://www.themoviedb.org/movie/550/" data-track-action="TMDB">
   */
  async resolveBySlug(letterboxdSlug: string): Promise<MoviePageInfo> {
    const response = await this.http.get<string>(`/film/${letterboxdSlug}/`);

    if (response.status === 404) {
      this.logger.warn(`Letterboxd film slug ${letterboxdSlug} not found`);
      return { tmdbId: null, title: null, year: null };
    }
    if (response.status !== 200) {
      throw new Error(`Letterboxd /film/${letterboxdSlug}/ returned ${response.status}`);
    }

    const $ = cheerio.load(response.data);

    // TMDB link variants we've seen on letterboxd film pages
    let tmdbId: string | null = null;
    const tmdbAnchor = $('a[href*="themoviedb.org/movie/"]').first();
    const href = tmdbAnchor.attr("href");
    if (href) {
      const match = href.match(/themoviedb\.org\/movie\/(\d+)/);
      if (match) tmdbId = match[1];
    }

    const title = $('section.film-header-group h1.headline-1, h1.filmtitle').first().text().trim() || null;
    const yearText = $("small.number a").first().text().trim();
    const year = yearText && /^\d{4}$/.test(yearText) ? parseInt(yearText, 10) : null;

    return { tmdbId, title, year };
  }
}
