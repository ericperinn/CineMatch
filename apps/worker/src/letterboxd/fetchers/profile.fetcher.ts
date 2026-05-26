import { Injectable, Logger } from "@nestjs/common";
import * as cheerio from "cheerio";
import { LetterboxdHttpClient } from "../http.client";

export interface ProfileFavorite {
  letterboxdSlug: string;
  posterAlt: string | null;
}

@Injectable()
export class ProfileFetcher {
  private readonly logger = new Logger(ProfileFetcher.name);

  constructor(private readonly http: LetterboxdHttpClient) {}

  /**
   * Returns the (at most 4) pinned favorite films from the user's profile.
   * If the user has no favorites pinned, returns an empty array.
   */
  async fetchFavorites(letterboxdUsername: string): Promise<ProfileFavorite[]> {
    const response = await this.http.get<string>(`/${letterboxdUsername}/`, letterboxdUsername);

    if (response.status === 404) {
      this.logger.warn(`Letterboxd profile ${letterboxdUsername} not found (404)`);
      return [];
    }
    if (response.status !== 200) {
      throw new Error(
        `Letterboxd profile ${letterboxdUsername} returned ${response.status}`,
      );
    }

    const $ = cheerio.load(response.data);
    const favorites: ProfileFavorite[] = [];
    const seen = new Set<string>();

    // Letterboxd renders favorites server-side as React components with
    // data-item-slug. The structure changed in 2025 from <div class="film-poster"
    // data-film-slug=...> to a wrapping <div class="react-component"
    // data-item-slug=...>. Keep both selectors as fallback in case they rotate.
    $(
      "#favourites .react-component[data-item-slug], #favourites .film-poster[data-film-slug]",
    ).each((_, el) => {
      const slug = $(el).attr("data-item-slug") ?? $(el).attr("data-film-slug");
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      const posterAlt =
        $(el).attr("data-item-name") ?? $(el).find("img").attr("alt") ?? null;
      favorites.push({ letterboxdSlug: slug, posterAlt });
    });

    if (favorites.length === 0) {
      const sectionExists = $("#favourites").length > 0;
      this.logger.warn(
        sectionExists
          ? `Favorites section present but no slugs parsed for ${letterboxdUsername} — selector may have changed`
          : `User ${letterboxdUsername} has no favorites pinned`,
      );
    }

    return favorites.slice(0, 4);
  }
}
