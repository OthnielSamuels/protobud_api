import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config(); // loads .env

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ??
      "postgresql://protobot:protobot@postgres:5432/protobot",
  },
});