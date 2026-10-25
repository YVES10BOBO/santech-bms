import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getProjects, getProject, createProject, updateProject } from '../controllers/projectsController'

const router = Router()
router.use(authenticate)

router.get('/', getProjects)
router.get('/:id', getProject)
router.post('/', authorize('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'), createProject)
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'), updateProject)

export default router
