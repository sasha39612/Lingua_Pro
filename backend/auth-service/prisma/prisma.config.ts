import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DATABASE_URL_UNPOOLED,
    },
  },
});
