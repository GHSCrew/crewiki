import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    // Used only by Prisma CLI tools (migrate diff, db push).
    // Runtime connections go through the libsql adapter in lib/prisma.ts.
    url: "file:./prisma/dev.db",
  },
});
