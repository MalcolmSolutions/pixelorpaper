// @ts-expect-error The adapter is provided by the OpenNext build environment.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({
  cloudflare: {
    outputDir: ".open-next",
  },
});
