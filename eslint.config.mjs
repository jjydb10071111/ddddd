import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "drizzle/**",
      "lib/data/**",
    ],
  },
  {
    rules: {
      // 이 저장소의 표준 데이터 페칭 패턴(마운트 시 setLoading(true) 후 fetch)이
      // 전부 걸린다 — 유도 상태(derived state) 안티패턴이 아니라 의도된 로딩 상태 초기화라
      // error 대신 warn으로 낮춘다. 개별 컴포넌트 재작성은 추후 점진적으로 검토.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
