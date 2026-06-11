import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { type UserConfig, build, defineConfig } from "vite";

function copyManifestPlugin() {
  return {
    name: "copy-manifest",
    closeBundle() {
      mkdirSync("dist", { recursive: true });
      copyFileSync("public/manifest.json", "dist/manifest.json");
    }
  };
}

const contentConfig: UserConfig = {
  build: {
    emptyOutDir: true,
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      name: "DingTalkAiSidebarContent",
      formats: ["iife"],
      fileName: () => "content.js"
    }
  },
  plugins: [copyManifestPlugin()]
};

const backgroundBuildPlugin = {
  name: "background-build",
  async closeBundle() {
    await build({
      configFile: false,
      build: backgroundBuild.build
    });
  }
};

const backgroundBuild: UserConfig = {
  build: {
    emptyOutDir: false,
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/background/index.ts"),
      formats: ["es"],
      fileName: () => "background.js"
    }
  }
};

contentConfig.plugins = [copyManifestPlugin(), backgroundBuildPlugin];

export default defineConfig(contentConfig);
