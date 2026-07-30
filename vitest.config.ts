import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        include: ["src/**/*.test.ts"],
        environment: "node",
        globals: true,
        // Integration tests spin up an in-memory MongoDB in `beforeAll` (see
        // src/test/db.ts). A cold `mongod` start can exceed Vitest's 10s default,
        // so we allow generous hook/test timeouts. Pure unit tests are unaffected
        // — they still finish in milliseconds.
        testTimeout: 20_000,
        hookTimeout: 120_000,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            // Test scaffolding and type-only files are not meaningful coverage targets.
            exclude: [
                "src/**/*.test.ts",
                "src/test/**",
                "src/types/**",
                "src/**/*.d.ts",
            ],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
