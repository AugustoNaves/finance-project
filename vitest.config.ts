import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

process.env.TZ = "America/Sao_Paulo";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/styles.ts", "src/**/style.ts", "src/**/styled.ts", "src/styles/**", "src/types/**"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
          setupFiles: ["tests/setup/node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["tests/ui/**/*.test.tsx"],
          setupFiles: ["tests/setup/ui.ts"],
        },
      },
    ],
  },
});
