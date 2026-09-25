import { globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  globalIgnores([".open-next/**"]),
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;
