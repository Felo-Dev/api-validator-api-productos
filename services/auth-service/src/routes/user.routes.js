import { Router } from 'express';
import * as userCtrl from '../controllers/user.controllers.js';

const router = Router();

router.get('/', userCtrl.list);
router.get('/:id', userCtrl.get);
router.post('/', userCtrl.create);
router.put('/:id', userCtrl.update);
router.delete('/:id', userCtrl.remove);

export default router;
