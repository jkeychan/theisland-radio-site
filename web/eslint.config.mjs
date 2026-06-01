import { createRequire } from "module";

const require = createRequire(import.meta.url);

// eslint-config-next 15 exports native flat configs — import directly to avoid
// FlatCompat's JSON.stringify validator choking on eslint-plugin-react's circular refs.
const nextConfig = require("eslint-config-next");
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

const eslintConfig = [
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@next/next/no-img-element": "off",
      // Setting loading/error state synchronously before an async call in useEffect
      // is an established pattern; the rule is overly strict here.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Node/CLI scripts: allow CommonJS require and console
  {
    files: [
      "scripts/**/*.js",
      "jest.config.js",
      "archive-playlist.js",
      "csv-to-archive-converter.js",
      "island-show.js",
      "spotify-api.js",
      "src/__tests__/island-show.test.js",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import/no-commonjs": "off",
      "no-console": "off",
    },
  },
];

export default eslintConfig;
