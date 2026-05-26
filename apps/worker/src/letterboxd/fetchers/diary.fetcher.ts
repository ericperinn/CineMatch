import { Injectable, Logger } from "@nestjs/common";
import Parser from "rss-parser";
import { LetterboxdHttpClient } from "../http.client";
import { letterboxdRatingToInt } from "../rating-converter";

export interface DiaryEntry {
  tmdbId: string;
  letterboxdSlug: string | null;
  title: string;
  ratingInt: number | null;
  watchedAt: Date | null;
}

interface LetterboxdDiaryItem {
  title?: string;
  link?: string;
  pubDate?: string;
  "letterboxd:watchedDate"?: string;
  "letterboxd:memberRating"?: string;
  "letterboxd:filmTitle"?: string;
  "tmdb:movieId"?: string;
}

@Injectable()
export class DiaryFetcher {
  private readonly logger = new Logger(DiaryFetcher.name);
  private readonly parser: Parser<unknown, LetterboxdDiaryItem>;

  constructor(private readonly http: LetterboxdHttpClient) {
    this.parser = new Parser({
      customFields: {
        item: [
          "letterboxd:watchedDate",
          "letterboxd:memberRating",
          "letterboxd:filmTitle",
          "tmdb:movieId",
        ],
      },
    });
  }

  async fetch(letterboxdUsername: string, limit = 50): Promise<DiaryEntry[]> {
    const response = await this.http.get<string>(`/${letterboxdUsername}/rss/`, letterboxdUsername);

    if (response.status === 404) {
      this.logger.warn(`Letterboxd user ${letterboxdUsername} not found (404)`);
      return [];
    }

    if (response.status !== 200) {
      throw new Error(
        `Letterboxd diary RSS for ${letterboxdUsername} returned ${response.status}`,
      );
    }

    const feed = await this.parser.parseString(response.data);
    const items = (feed.items as LetterboxdDiaryItem[]) ?? [];

    return items
      .slice(0, limit)
      .map((item) => this.parseItem(item))
      .filter((entry): entry is DiaryEntry => entry !== null);
  }

  private parseItem(item: LetterboxdDiaryItem): DiaryEntry | null {
    const tmdbId = item["tmdb:movieId"];
    if (!tmdbId) {
      // RSS sometimes omits tmdb mapping for very obscure or list items
      return null;
    }

    const ratingStars = item["letterboxd:memberRating"]
      ? parseFloat(item["letterboxd:memberRating"])
      : null;
    const watchedRaw = item["letterboxd:watchedDate"] ?? item.pubDate;

    return {
      tmdbId,
      letterboxdSlug: this.extractSlug(item.link),
      title: item["letterboxd:filmTitle"] ?? item.title ?? "",
      ratingInt: letterboxdRatingToInt(ratingStars),
      watchedAt: watchedRaw ? new Date(watchedRaw) : null,
    };
  }

  private extractSlug(link: string | undefined): string | null {
    if (!link) return null;
    // Diary item links look like https://letterboxd.com/{user}/film/{slug}/
    const match = link.match(/\/film\/([^/]+)\/?/);
    return match ? match[1] : null;
  }
}
