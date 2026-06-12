import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        setupFiles: ["./tests/setup.ts"],
        testTimeout: 15000,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            include: ["src/**/*.ts"],
            exclude: [
                "src/types/**",
                "src/**/*.d.ts",
                "src/index.ts",
                "src/app.ts",
            ],
        },
    },
});
