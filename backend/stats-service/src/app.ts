import express from 'express';
import setRoutes from './routes/stats.routes';

const app = express();

app.use(express.json());

app.use(setRoutes);

export default app;