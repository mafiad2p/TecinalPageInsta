import axios from "axios";
import { withRateLimit } from "../../tools/rate-limiter.js";
import { childLogger } from "../../core/logger.js";

const log = childLogger({ module: "instagram-client" });
const FB_API_BASE = "https://graph.facebook.com/v21.0";

export async function igPost<T>(
  pageId: string,
  accessToken: string,
  endpoint: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  return withRateLimit(pageId, async () => {
    const url = `${FB_API_BASE}${endpoint}`;
    const response = await axios.post<T>(url, data, {
      params: { access_token: accessToken },
    });
    log.debug({ endpoint, pageId }, "Instagram POST success");
    return response.data;
  });
}

export async function igGet<T>(
  pageId: string,
  accessToken: string,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  return withRateLimit(pageId, async () => {
    const url = `${FB_API_BASE}${endpoint}`;
    const response = await axios.get<T>(url, {
      params: { access_token: accessToken, ...params },
    });
    log.debug({ endpoint, pageId }, "Instagram GET success");
    return response.data;
  });
}
