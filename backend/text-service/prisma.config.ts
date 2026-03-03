import { defineConfig } from '@prisma/internals';

export default defineConfig({
  datasources: {
    db: {
      // Prisma CLI requires a non-undefined url property for "migrate dev".
      // using empty string as fallback lets the command run and then error during
      // connection if the variable isn't set.
      url: process.env.DATABASE_URL || '',
      directUrl: process.env.DATABASE_URL_UNPOOLED,
    },
  },
});