import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { ADMINS, SALES } from '../lib/roles'
import { getLeads, createLead, updateLead, advanceLead, convertLead, deleteLead } from '../controllers/leadsController'
import { getQuotations, createQuotation, updateQuotation, advanceQuotation, rejectQuotation, convertQuotation } from '../controllers/quotationsController'
import {
  getTickets, createTicket, updateTicket,
  getProducts, createProduct, updateProduct,
  getDepartments, saveDepartment,
  getVisitors, createVisitor, visitorAction,
} from '../controllers/operationsController'
import { getUsers, createUser, updateUser, getNotifications, getUnreadCount, markNotificationsRead } from '../controllers/usersController'
import { getCommunications, createCommunication, updateCommunication, getMeetings, createMeeting, updateMeeting } from '../controllers/activityController'
import { getSubscriptions, saveSubscription, paySubscription, renewSubscription, getCampaigns, saveCampaign, getTimesheets, createTimesheet, reviewTimesheet } from '../controllers/growthController'
import { FINANCE, PROJECT_LEADS } from '../lib/roles'
import {
  getDocuments, getDocumentFolders, saveDocument, deleteDocument, getAttendance, saveAttendance, requestLeave, reviewLeave,
  getTenders, saveTender, getPurchases, createPurchase, updatePurchaseStatus,
  getTrainings, saveTraining, addAttendee, updateAttendee,
  getArticles, saveArticle, viewArticle, getCompany, saveCompany,
} from '../controllers/officeController'

// Leads, quotations, support, products, departments, reception, users, notifications
const router = Router()
// Login is required on these paths only, so unknown /api URLs still return 404
router.use([
  '/leads', '/quotations', '/tickets', '/products', '/departments', '/visitors', '/users', '/notifications',
  '/communications', '/meetings', '/client-services', '/campaigns', '/timesheets',
  '/documents', '/attendance', '/leave', '/tenders', '/purchases', '/trainings', '/articles', '/settings',
], authenticate)

// Leads (sales team)
router.get('/leads', authorize(...SALES), getLeads)
router.post('/leads', authorize(...SALES), createLead)
router.put('/leads/:id', authorize(...SALES), updateLead)
router.post('/leads/:id/advance', authorize(...SALES), advanceLead)
router.post('/leads/:id/convert', authorize(...SALES), convertLead)
router.delete('/leads/:id', authorize(...ADMINS), deleteLead)

// Quotations (each approval step is checked in the controller)
router.get('/quotations', authorize(...SALES), getQuotations)
router.post('/quotations', authorize(...SALES), createQuotation)
router.put('/quotations/:id', authorize(...SALES), updateQuotation)
router.post('/quotations/:id/advance', authorize(...SALES), advanceQuotation)
router.post('/quotations/:id/reject', authorize(...SALES), rejectQuotation)
router.post('/quotations/:id/convert', authorize(...ADMINS, 'SALES_MANAGER', 'FINANCE_MANAGER'), convertQuotation)

// Support tickets (any staff can log a ticket; leads manage them)
router.get('/tickets', getTickets)
router.post('/tickets', createTicket)
router.put('/tickets/:id', authorize(...ADMINS, 'PROJECT_MANAGER', 'EMPLOYEE', 'SALES_MANAGER'), updateTicket)

// Product catalog (everyone reads; admins edit)
router.get('/products', getProducts)
router.post('/products', authorize(...ADMINS), createProduct)
router.put('/products/:id', authorize(...ADMINS), updateProduct)

// Departments
router.get('/departments', getDepartments)
router.post('/departments', authorize(...ADMINS), saveDepartment)
router.put('/departments/:id', authorize(...ADMINS), saveDepartment)

// Reception
router.get('/visitors', getVisitors)
router.post('/visitors', createVisitor)
router.post('/visitors/:id/:action', visitorAction)

// Users (admins)
router.get('/users', authorize(...ADMINS), getUsers)
router.post('/users', authorize(...ADMINS), createUser)
router.put('/users/:id', authorize(...ADMINS), updateUser)

// Communication log and meetings (all staff)
router.get('/communications', getCommunications)
router.post('/communications', createCommunication)
router.put('/communications/:id', updateCommunication)
router.get('/meetings', getMeetings)
router.post('/meetings', createMeeting)
router.put('/meetings/:id', updateMeeting)

// Client services & renewals (finance + management)
router.get('/client-services', authorize(...FINANCE, 'SALES_MANAGER'), getSubscriptions)
router.post('/client-services', authorize(...FINANCE), saveSubscription)
router.put('/client-services/:id', authorize(...FINANCE), saveSubscription)
router.post('/client-services/:id/pay', authorize(...FINANCE), paySubscription)
router.post('/client-services/:id/renew', authorize(...FINANCE), renewSubscription)

// Marketing campaigns
router.get('/campaigns', authorize(...SALES), getCampaigns)
router.post('/campaigns', authorize(...ADMINS, 'MARKETING_MANAGER', 'SALES_MANAGER'), saveCampaign)
router.put('/campaigns/:id', authorize(...ADMINS, 'MARKETING_MANAGER', 'SALES_MANAGER'), saveCampaign)

// Timesheets (everyone logs own time; project leads review)
router.get('/timesheets', getTimesheets)
router.post('/timesheets', createTimesheet)
router.post('/timesheets/:id/:decision', authorize(...PROJECT_LEADS), reviewTimesheet)

// Documents
router.get('/documents/folders', getDocumentFolders) // automatic folder tree (Drive-style page)
router.get('/documents', getDocuments)
router.post('/documents', saveDocument)
router.put('/documents/:id', saveDocument)
router.delete('/documents/:id', authorize(...ADMINS), deleteDocument) // permanent, archived only

// Attendance & leave (staff see their own; admins see everyone)
router.get('/attendance', getAttendance)
router.post('/attendance', saveAttendance)
router.post('/leave', requestLeave)
router.post('/leave/:id/:decision', authorize(...ADMINS), reviewLeave)

// Tenders (sales team)
router.get('/tenders', authorize(...SALES), getTenders)
router.post('/tenders', authorize(...SALES), saveTender)
router.put('/tenders/:id', authorize(...SALES), saveTender)

// Procurement (anyone requests; finance approves and tracks delivery)
router.get('/purchases', getPurchases)
router.post('/purchases', createPurchase)
router.put('/purchases/:id/status', authorize(...FINANCE), updatePurchaseStatus)

// Training
router.get('/trainings', getTrainings)
router.post('/trainings', authorize(...ADMINS, 'PROJECT_MANAGER', 'MARKETING_MANAGER'), saveTraining)
router.put('/trainings/:id', authorize(...ADMINS, 'PROJECT_MANAGER', 'MARKETING_MANAGER'), saveTraining)
router.post('/trainings/:id/attendees', addAttendee)
router.put('/trainings/:id/attendees/:attendeeId', authorize(...ADMINS, 'PROJECT_MANAGER', 'MARKETING_MANAGER', 'FINANCE_MANAGER'), updateAttendee)

// Knowledge base (anyone writes; drafts are private)
router.get('/articles', getArticles)
router.post('/articles', saveArticle)
router.put('/articles/:id', saveArticle)
router.post('/articles/:id/view', viewArticle)

// Company profile (everyone reads; admins edit)
router.get('/settings/company', getCompany)
router.put('/settings/company', authorize(...ADMINS), saveCompany)

// Notifications for the logged-in user
router.get('/notifications', getNotifications)
router.get('/notifications/unread-count', getUnreadCount)
router.post('/notifications/read', markNotificationsRead)

export default router
