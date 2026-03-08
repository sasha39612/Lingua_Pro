export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/lingua_pro_auth?schema=public'
    }
  }
};
