import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // ".next-verificacao" e a pasta de saida do "npm run verificar", que
    // existe para o build de verificacao nao pisar o ".next" do servidor
    // de desenvolvimento. Ja estava no .gitignore, mas o ESLint continuava
    // a percorre-la e a devolver milhares de erros de codigo compilado.
    ignores: [".next/**", ".next-verificacao/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
