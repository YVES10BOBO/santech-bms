import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { getSignatures, createSignature, updateSignature, deleteSignature, signDocument } from '../controllers/signaturesController'

// Saved signatures / stamps and signing a document (staff only: portal logins are blocked by authenticate)
const router = Router()
router.use(authenticate)
router.get('/', getSignatures)
router.post('/', createSignature)
router.post('/sign', signDocument)
router.put('/:id', updateSignature)
router.delete('/:id', deleteSignature)

export default router
