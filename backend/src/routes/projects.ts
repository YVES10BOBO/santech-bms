import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getProjects, getProject, createProject, updateProject, deleteProject,
  getMilestones, createMilestone, updateMilestone,
  completeMilestone, approveMilestone, invoiceMilestone,
} from '../controllers/projectsController'
import { ADMINS, FINANCE, PROJECT_LEADS } from '../lib/roles'

const router = Router()
router.use(authenticate)

// Milestones (registered before /:id so the paths never clash)
router.get('/milestones/all', getMilestones)
router.post('/milestones', authorize(...PROJECT_LEADS), createMilestone)
router.put('/milestones/:id', authorize(...PROJECT_LEADS), updateMilestone)
router.post('/milestones/:id/complete', authorize(...PROJECT_LEADS), completeMilestone)
router.post('/milestones/:id/approve', authorize(...ADMINS), approveMilestone)
router.post('/milestones/:id/invoice', authorize(...FINANCE), invoiceMilestone)

// Projects
router.get('/', getProjects)
router.get('/:id', getProject)
router.post('/', authorize(...PROJECT_LEADS), createProject)
router.put('/:id', authorize(...PROJECT_LEADS), updateProject)
router.delete('/:id', authorize(...ADMINS), deleteProject)

export default router
