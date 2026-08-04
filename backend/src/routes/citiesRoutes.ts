import { Router } from 'express';
import { getCities } from '../controllers/citiesController';

const router = Router();

router.get('/', getCities);

export default router;
