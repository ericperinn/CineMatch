import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dim: number;
}

@Injectable()
export class MlClient {
  private readonly logger = new Logger(MlClient.name);
  private readonly axios: AxiosInstance;

  constructor(config: ConfigService) {
    const baseURL = config.get<string>("ML_SERVICE_URL", "http://ml:8000");
    this.axios = axios.create({
      baseURL,
      timeout: 30_000,
      validateStatus: (status) => status < 500,
    });
  }

  /**
   * Send a batch of texts to the ML service and get back normalized 384-dim
   * embedding vectors. Throws on non-2xx responses (caller is expected to
   * let BullMQ handle the retry).
   */
  async embed(texts: string[]): Promise<EmbedResponse> {
    if (texts.length === 0) {
      return { embeddings: [], model: "", dim: 0 };
    }

    const response = await this.axios.post<EmbedResponse>("/embed", { texts });

    if (response.status === 503) {
      throw new Error("ML service still loading — will retry");
    }
    if (response.status !== 200) {
      throw new Error(`ML /embed returned ${response.status}`);
    }

    return response.data;
  }
}
