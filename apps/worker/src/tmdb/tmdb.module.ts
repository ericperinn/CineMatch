import { Global, Module } from "@nestjs/common";
import { TmdbClient } from "./tmdb.client";

@Global()
@Module({
  providers: [TmdbClient],
  exports: [TmdbClient],
})
export class TmdbModule {}
