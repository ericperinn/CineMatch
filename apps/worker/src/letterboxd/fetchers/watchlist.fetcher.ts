import { Injectable, Logger } from "@nestjs/common";
import * as cheerio from "cheerio";
import { LetterboxdHttpClient } from "../http.client";

export interface WatchlistEntry {
  letterboxdSlug: string;
  posterAlt: string | null;
}

const MAX_PAGES = 30; // 30 × 28 per page = 840 films, more than enough for MVP

@Injectable()
export class WatchlistFetcher {
  private readonly logger = new Logger(WatchlistFetcher.name);

  constructor(private readonly http: LetterboxdHttpClient) {}

  /**
   * Walks the user's watchlist page-by-page until it runs out of items
   * or hits MAX_PAGES (safety cap). Returns deduplicated slugs.
   */
  async fetchAll(letterboxdUsername: string): Promise<WatchlistEntry[]> {
    const seen = new Set<string>();
    const entries: WatchlistEntry[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const path = page === 1
        ? `/${letterboxdUsername}/watchlist/`
        : `/${letterboxdUsername}/watchlist/page/${page}/`;

      const response = await this.http.get<string>(path, letterboxdUsername);

      if (response.status === 404) {
        // page 1 of an existing user with empty watchlist is 200 with no items,
        // so 404 means the user does not exist or has private profile
        if (page === 1) {
          this.logger.warn(`Watchlist for ${letterboxdUsername} not accessible (404)`);
        }
        break;
      }
      if (response.status !== 200) {
        throw new Error(
          `Letterboxd watchlist ${path} returned ${response.status}`,
        );
      }

      const pageEntries = this.parsePage(response.data);
      if (pageEntries.length === 0) {
        if (page === 1) {
          this.logger.warn(
            `Watchlist for ${letterboxdUsername} returned 0 items — likely a Letterboxd lazy-load (see docs/06-letterboxd.md) or an empty/private list`,
          );
        }
        break;
      }

      let newOnThisPage = 0;
      for (const entry of pageEntries) {
        if (seen.has(entry.letterboxdSlug)) continue;
        seen.add(entry.letterboxdSlug);
        entries.push(entry);
        newOnThisPage++;
      }

      // If a page returned only already-seen items, we've started looping
      if (newOnThisPage === 0) break;
    }

    return entries;
  }

  private parsePage(html: string): WatchlistEntry[] {
    const $ = cheerio.load(html);
    const entries: WatchlistEntry[] = [];

    // KNOWN LIMITATION: as of 2025, watchlist items are lazy-loaded by React
    // on the client. The initial HTML response carries no film slugs, so this
    // selector returns nothing. Tracked as a Phase 4 follow-up — options are
    // (a) CSV import, (b) a Playwright-rendered fetcher, (c) reverse-engineer
    // the AJAX endpoint. See docs/06-letterboxd.md.
    $(
      "ul.poster-list .react-component[data-item-slug], ul.poster-list .film-poster[data-film-slug]",
    ).each((_, el) => {
      const slug = $(el).attr("data-item-slug") ?? $(el).attr("data-film-slug");
      if (!slug) return;
      const posterAlt =
        $(el).attr("data-item-name") ?? $(el).find("img").attr("alt") ?? null;
      entries.push({ letterboxdSlug: slug, posterAlt });
    });

    return entries;
  }
}
