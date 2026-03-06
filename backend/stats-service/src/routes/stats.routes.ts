import { Router } from 'express';
import StatsController from '../controllers/stats.controller';

const router = Router();
const statsController = new StatsController();

router.get('/stats', statsController.getStats.bind(statsController));

export default router;