import "@testing-library/jest-dom/vitest";

// Testler için varsayılan env (tekil testler override edebilir)
process.env.CF_ACCOUNT_ID ||= "test-account";
process.env.CF_D1_DATABASE_ID ||= "test-db";
process.env.CF_API_TOKEN ||= "test-token";
process.env.APP_PIN ||= "1234";
