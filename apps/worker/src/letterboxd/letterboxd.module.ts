import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "../queues/queue-names";
import { DiaryFetcher } from "./fetchers/diary.fetcher";
import { MoviePageFetcher } from "./fetchers/movie-page.fetcher";
import { ProfileFetcher } from "./fetchers/profile.fetcher";
import { WatchlistFetcher } from "./fetchers/watchlist.fetcher";
import { LetterboxdHttpClient } from "./http.client";
import { DiscoverMovieProcessor } from "./processors/discover-movie.processor";
import { SyncProfileProcessor } from "./processors/sync-profile.processor";

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SYNC_PROFILE },
      { name: QUEUE_NAMES.DISCOVER_MOVIE },
    ),
  ],
  providers: [
    LetterboxdHttpClient,
    DiaryFetcher,
    ProfileFetcher,
    WatchlistFetcher,
    MoviePageFetcher,
    SyncProfileProcessor,
    DiscoverMovieProcessor,
  ],
})
export class LetterboxdModule {}
