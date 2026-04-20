export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://lingua:secret@postgres:5432/ai_orchestrator_db'
    }
  }
};
