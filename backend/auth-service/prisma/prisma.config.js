// simple JS Prisma config used by CLI for migrations
// note: avoid pulling in @prisma/internals dependency
module.exports = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || '',
      directUrl: process.env.DATABASE_URL_UNPOOLED,
    },
  },
};