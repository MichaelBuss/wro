import { custom, defineConfig, github } from "@readyrun/readyrun";

export default defineConfig({
  tracker: github({
    repo: "MichaelBuss/wro",
    ready: "unblocked",
    labels: ["ready-for-agent"],
  }),
  worker: custom({
    bin: "opencode",
    args: ["run"],
    unattendedFlag: "--auto",
  }),
  model: "zai-coding-plan/glm-5.3-flash",
  permissions: "unattended",
  contextFile: "CONTEXT.md",
});
