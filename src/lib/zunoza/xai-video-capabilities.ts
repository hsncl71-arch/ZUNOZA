/** Live-probed xAI video capabilities. Do not advertise a mode the product model rejects. */

export const XAI_PRODUCT_VIDEO_MODEL = "grok-imagine-video-1.5";
export const XAI_CLASSIC_VIDEO_MODEL = "grok-imagine-video";

/**
 * Probed 2026-09-19 against api.x.ai with the workspace key:
 * POST /v1/videos/extensions model=grok-imagine-video-1.5 → 400
 *   "Video extension is not supported for this model."
 * POST /v1/videos/edits model=grok-imagine-video-1.5 → 400
 *   "Video editing is not supported for this model."
 * POST /v1/videos/extensions model=grok-imagine-video + public MP4 + duration 2 → 200, status done.
 * Series stays on 1.5 (identity / r2v / last_frame). Classic extend is not mixed in.
 */
export const XAI_VIDEO_CAPABILITIES = {
  generate: {
    model: XAI_PRODUCT_VIDEO_MODEL,
    endpoint: "/v1/videos/generations",
    durations: [5, 10, 15] as const,
    resolutions: ["480p", "720p", "1080p"] as const,
    r2vMaxResolution: "720p" as const,
    accessible: true,
  },
  extend: {
    docsEndpoint: "/v1/videos/extensions",
    docsInputSeconds: [2, 15] as const,
    docsExtendSeconds: [2, 10] as const,
    docsResolutionCap: "720p" as const,
    productModelSupported: false,
    classicModelSupported: true,
    classicModel: XAI_CLASSIC_VIDEO_MODEL,
    usedInProduct: false,
    reason:
      "grok-imagine-video-1.5 uzatma ve düzenlemeyi reddeder. Klasik grok-imagine-video uzatır ama dizi yüz/ses kilidi 1.5 referans yolundadır; modeller karıştırılmaz.",
  },
  edit: {
    docsEndpoint: "/v1/videos/edits",
    productModelSupported: false,
    classicModelSupported: true,
    usedInProduct: false,
    reason: "Video düzenleme grok-imagine-video-1.5 için kapalı.",
  },
} as const;

export function seriesUsesVideoExtend() {
  return XAI_VIDEO_CAPABILITIES.extend.usedInProduct && XAI_VIDEO_CAPABILITIES.extend.productModelSupported;
}
