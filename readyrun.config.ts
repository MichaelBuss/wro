import { claude, defineConfig, github } from "@readyrun/readyrun";

export default defineConfig({
  tracker: github({
    repo: "MichaelBuss/wro",
    ready: "unblocked",
    labels: ["ready-for-agent"],
  }),
  worker: claude(),
  model: "opus",
  permissions: "unattended",
  contextFile: "CONTEXT.md",
});
