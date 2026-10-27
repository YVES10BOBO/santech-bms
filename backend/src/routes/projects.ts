import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getMilestones, createMilestone, updateMilestone
} from '../controllers/projectsController'

const router = Router()
router.use(authenticate)

// Projects
router.get('/', getProjects)
router.get('/:id', getProject)
router.post('/', createProject)
router.put('/:id', updateProject)
router.delete('/:id', deleteProject)

// Milestones
router.get('/milestones/all', getMilestones)
router.post('/milestones', createMilestone)
router.put('/milestones/:id', updateMilestone)

export default router
