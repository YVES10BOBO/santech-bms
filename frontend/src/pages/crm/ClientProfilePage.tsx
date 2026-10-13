
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Plus, MapPin, UserPlus, Phone, Users, Mail,
  FileText, FileCheck, Receipt, DollarSign, StickyNote, RefreshCw,
  Download, Calendar, Building2, User, Globe, X
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type ClientKind = 'INDIVIDUAL' | 'BUSINESS' | 'TEAM' | 'DELEGATION'
type CRMStatus = 'PROSPECT' | 'LEAD' | 'NEGOTIATION' | 'ACTIVE_CLIENT' | 'RECURRING' | 'INACTIVE' | 'LOST'
type TimelineEventType =
  | 'FIELD_VISIT' | 'LEAD_CREATED' | 'CALL' | 'MEETING' | 'EMAIL'
  | 'QUOTATION' | 'CONTRACT' | 'INVOICE' | 'PAYMENT' | 'NOTE'
  | 'STATUS_CHANGE' | 'RENEWAL'

type ServiceStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING'
type ContractStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PENDING'
type InvoiceStatus = 'PAID' | 'UNPAID' | 'PARTIAL' | 'OVERDUE'
type DocumentType = 'Contract' | 'Proposal' | 'Invoice' | 'Other'

interface Member {
  name: string
  phone: string
  role: string
}

interface TimelineEvent {
  id: string
  type: TimelineEventType
  date: string
  title: string
  description: string
  addedBy: string
}

interface ClientService {
  name: string
  description?: string
  status: ServiceStatus
  startDate?: string
  renewalDate?: string
}

interface ClientContract {
  number: string
  project: string
  value: number
  status: ContractStatus
  date?: string
}

interface ClientInvoice {
  number: string
  amount: number
  status: InvoiceStatus
  date: string
}

interface ClientDocument {
  name: string
  type: DocumentType
  date: string
}

interface ClientProfile {
  id: string
  kind: ClientKind
  crmStatus: CRMStatus
  createdAt: string
  // INDIVIDUAL
  fullName?: string
  phone?: string
  email?: string
  location?: string
  idNumber?: string
  // BUSINESS
  companyName?: string
  tinNumber?: string
  address?: string
  repName?: string
  repPhone?: string
  repEmail?: string
  industry?: string
  website?: string
  // TEAM
  teamName?: string
  orgName?: string
  teamLocation?: string
  leaderName?: string
  leaderPhone?: string
  leaderEmail?: string
  members?: Member[]
  // DELEGATION
  delegationName?: string
  origin?: string
  orgRepresented?: string
  visitPurpose?: string
  visitDate?: string
  delegationRepName?: string
  delegationRepPhone?: string
  delegationRepEmail?: string
  delegationMembers?: Member[]
  // Financial
  totalInvoiced: number
  totalPaid: number
  // Relations
  timeline: TimelineEvent[]
  services: ClientService[]
  contracts: ClientContract[]
  invoices: ClientInvoice[]
  documents: ClientDocument[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockProfiles: ClientProfile[] = [
  {
    id: '1',
    kind: 'INDIVIDUAL',
    crmStatus: 'ACTIVE_CLIENT',
    createdAt: '2026-08-10',
    fullName: 'Jean Pierre Habimana',
    phone: '0788100001',
    email: 'jp@gmail.com',
    location: 'Kigali',
    totalInvoiced: 800000,
    totalPaid: 400000,
    timeline: [
      { id: 't1', type: 'FIELD_VISIT',   date: '2026-09-10', title: 'Field visit to Jean Pierre\'s home office',               description: 'Visited client at home office to discuss digital presence needs.',           addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'LEAD_CREATED',  date: '2026-09-11', title: 'Added as lead after showing interest in website',           description: 'Client expressed strong interest in website development services.',         addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'CALL',          date: '2026-09-12', title: 'Follow-up call, discussed website requirements',            description: 'Discussed scope, pages needed, design preferences and timeline.',           addedBy: 'Alice Uwimana' },
      { id: 't4', type: 'QUOTATION',     date: '2026-09-15', title: 'Quotation QT-2026-010 sent for website development',        description: 'Sent quotation for RWF 800,000 covering 5-page responsive website.',        addedBy: 'Alice Uwimana' },
      { id: 't5', type: 'EMAIL',         date: '2026-09-18', title: 'Client requested changes to quotation scope',              description: 'Client emailed requesting addition of e-commerce module to the scope.',     addedBy: 'Jean Pierre' },
      { id: 't6', type: 'CONTRACT',      date: '2026-09-20', title: 'Contract CT-2026-010 signed for website development',       description: 'Both parties signed the contract. 50% upfront payment agreed.',             addedBy: 'Admin' },
      { id: 't7', type: 'INVOICE',       date: '2026-10-01', title: 'Invoice INV-2026-010 sent — RWF 400,000 (50% upfront)',     description: 'First invoice of RWF 400,000 issued for project kickoff payment.',          addedBy: 'Admin' },
      { id: 't8', type: 'PAYMENT',       date: '2026-10-03', title: 'Payment received RWF 400,000 via Mobile Money',            description: 'Client paid RWF 400,000 via MTN Mobile Money. Receipt issued.',            addedBy: 'Admin' },
    ],
    services: [
      { name: 'Website Development',  description: 'Custom website design and development', status: 'ACTIVE',   startDate: '2026-09-20', renewalDate: '2027-09-20' },
      { name: 'Training & Consultancy', description: 'Staff training and IT consultancy',  status: 'PENDING',  startDate: '2026-10-15' },
    ],
    contracts: [
      { number: 'CT-2026-010', project: 'Personal Website', value: 800000, status: 'ACTIVE', date: '2026-09-20' },
    ],
    invoices: [
      { number: 'INV-2026-010', amount: 400000, status: 'PAID',   date: '2026-10-01' },
      { number: 'INV-2026-010b', amount: 400000, status: 'UNPAID', date: '2026-11-01' },
    ],
    documents: [
      { name: 'contract_jean_pierre.pdf', type: 'Contract',  date: '2026-09-20' },
      { name: 'quotation_QT-2026-010.pdf', type: 'Proposal', date: '2026-09-15' },
    ],
  },
  {
    id: '2',
    kind: 'BUSINESS',
    crmStatus: 'RECURRING',
    createdAt: '2026-07-15',
    companyName: 'East African Seed Ltd',
    tinNumber: 'RW123456789',
    address: 'Kigali',
    repName: 'John Mugisha',
    repPhone: '0788200001',
    repEmail: 'john@easeed.rw',
    industry: 'Agriculture',
    totalInvoiced: 1500000,
    totalPaid: 1500000,
    timeline: [
      { id: 't1', type: 'FIELD_VISIT',   date: '2026-09-17', title: 'First visit to East African Seed Ltd',                   description: 'Initial visit to assess client needs for stock management.',                addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'LEAD_CREATED',  date: '2026-09-18', title: 'Added as lead — interested in SANTRACK',                 description: 'Client confirmed strong interest after discovering inventory challenges.',   addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'MEETING',       date: '2026-09-20', title: 'Presented SANTRACK system demo at their office',          description: 'Full product demo conducted. Client loved real-time tracking features.',    addedBy: 'Alice Uwimana' },
      { id: 't4', type: 'QUOTATION',     date: '2026-09-25', title: 'Quotation QT-2026-001 sent — SANTRACK RWF 1,500,000',    description: 'Comprehensive quotation covering setup, training and first year support.',  addedBy: 'Alice Uwimana' },
      { id: 't5', type: 'CONTRACT',      date: '2026-09-28', title: 'Contract CT-2026-001 signed',                            description: 'Contract signed. Implementation scheduled for October 2026.',               addedBy: 'Admin' },
      { id: 't6', type: 'INVOICE',       date: '2026-10-01', title: 'Invoice INV-2026-001 sent — RWF 750,000 (50% upfront)',   description: 'First invoice for project kickoff payment.',                               addedBy: 'Admin' },
      { id: 't7', type: 'PAYMENT',       date: '2026-10-02', title: 'Payment received RWF 750,000 via Bank Transfer',         description: 'Bank transfer confirmed. Project kickoff scheduled.',                      addedBy: 'Admin' },
      { id: 't8', type: 'INVOICE',       date: '2026-12-01', title: 'Invoice INV-2026-001b sent — RWF 750,000 (50% on delivery)', description: 'Second invoice issued upon successful SANTRACK deployment.',           addedBy: 'Admin' },
      { id: 't9', type: 'PAYMENT',       date: '2026-12-15', title: 'Final payment received RWF 750,000',                    description: 'Final payment received. Project fully settled.',                           addedBy: 'Admin' },
      { id: 't10', type: 'STATUS_CHANGE', date: '2026-12-16', title: 'Status changed from Active Client to Recurring',        description: 'Client enrolled in annual maintenance & support plan.',                   addedBy: 'Admin' },
    ],
    services: [
      { name: 'SANTRACK',            description: 'Stock and inventory tracking system', status: 'ACTIVE',  startDate: '2026-10-01', renewalDate: '2027-10-01' },
      { name: 'Maintenance & Support', description: 'Ongoing system maintenance',        status: 'ACTIVE',  startDate: '2027-01-01', renewalDate: '2028-01-01' },
    ],
    contracts: [
      { number: 'CT-2026-001', project: 'SANTRACK Implementation', value: 1500000, status: 'COMPLETED', date: '2026-09-28' },
    ],
    invoices: [
      { number: 'INV-2026-001',  amount: 750000,  status: 'PAID', date: '2026-10-01' },
      { number: 'INV-2026-001b', amount: 750000,  status: 'PAID', date: '2026-12-01' },
    ],
    documents: [
      { name: 'contract_easeed.pdf',  type: 'Contract', date: '2026-09-28' },
      { name: 'invoice_001.pdf',      type: 'Invoice',  date: '2026-10-01' },
    ],
  },
  {
    id: '3',
    kind: 'BUSINESS',
    crmStatus: 'ACTIVE_CLIENT',
    createdAt: '2026-06-20',
    companyName: 'ECOBANK Rwanda',
    tinNumber: 'RW987654321',
    address: 'Kigali CBD',
    repName: 'KAMIKAZI',
    repPhone: '0786740490',
    repEmail: 'akamikazi@ecobank.com',
    industry: 'Banking',
    totalInvoiced: 2000000,
    totalPaid: 2000000,
    timeline: [
      { id: 't1', type: 'FIELD_VISIT',  date: '2026-06-01', title: 'Initial visit to ECOBANK Rwanda head office',            description: 'Met with IT director to assess access control needs.',                    addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'MEETING',      date: '2026-06-10', title: 'Demo of EVS and Custom Software solutions',              description: 'Presented EVS and Custom Software modules. Strong interest confirmed.',   addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'CONTRACT',     date: '2026-06-25', title: 'Contract CT-2026-003 signed for EVS + Custom Software',  description: 'Contract signed for combined EVS and custom banking software.',           addedBy: 'Admin' },
      { id: 't4', type: 'PAYMENT',      date: '2026-07-01', title: 'Full payment received RWF 2,000,000',                   description: 'Full project payment cleared by ECOBANK finance team.',                  addedBy: 'Admin' },
      { id: 't5', type: 'NOTE',         date: '2026-09-01', title: 'System fully deployed at all 3 branches',               description: 'EVS deployed at Head Office, Remera, and Kimironko branches.',          addedBy: 'Admin' },
    ],
    services: [
      { name: 'EVS (E-Visitors System)', description: 'Gate pass and visitor management', status: 'ACTIVE', startDate: '2026-07-01', renewalDate: '2027-07-01' },
      { name: 'Custom Software',         description: 'Tailored banking software solution', status: 'ACTIVE', startDate: '2026-07-01' },
    ],
    contracts: [
      { number: 'CT-2026-003', project: 'EVS + Custom Software', value: 2000000, status: 'COMPLETED', date: '2026-06-25' },
    ],
    invoices: [
      { number: 'INV-2026-003', amount: 2000000, status: 'PAID', date: '2026-07-01' },
    ],
    documents: [
      { name: 'contract_ecobank.pdf',   type: 'Contract', date: '2026-06-25' },
      { name: 'invoice_ecobank.pdf',    type: 'Invoice',  date: '2026-07-01' },
    ],
  },
  {
    id: '4',
    kind: 'TEAM',
    crmStatus: 'ACTIVE_CLIENT',
    createdAt: '2026-09-01',
    teamName: 'Santech Dev Team',
    orgName: 'Santech Innovate',
    teamLocation: 'Kigali',
    leaderName: 'Bob Nkurunziza',
    leaderPhone: '0788100002',
    leaderEmail: 'bob@santech.rw',
    members: [
      { name: 'Alice Uwimana', phone: '0788100003', role: 'Sales Lead' },
      { name: 'Eve Ingabire',  phone: '0788100004', role: 'Marketing' },
    ],
    totalInvoiced: 500000,
    totalPaid: 500000,
    timeline: [
      { id: 't1', type: 'LEAD_CREATED', date: '2026-09-01', title: 'Santech Dev Team registered as client',                  description: 'Internal team registered for SANHUB and training access.',               addedBy: 'Admin' },
      { id: 't2', type: 'CONTRACT',     date: '2026-09-05', title: 'Internal service agreement signed',                      description: 'Service agreement signed for SANHUB access and training sessions.',      addedBy: 'Admin' },
      { id: 't3', type: 'PAYMENT',      date: '2026-09-10', title: 'Internal cost allocation RWF 500,000',                   description: 'Budget allocation processed for SANHUB subscription and training.',      addedBy: 'Admin' },
      { id: 't4', type: 'NOTE',         date: '2026-09-15', title: 'Team completed first training session',                  description: 'All 3 members completed SANHUB onboarding training. Progress noted.',   addedBy: 'Admin' },
    ],
    services: [
      { name: 'SANHUB',              description: 'Training and learning hub',        status: 'ACTIVE', startDate: '2026-09-01', renewalDate: '2027-09-01' },
      { name: 'Training & Consultancy', description: 'Staff training sessions',        status: 'ACTIVE', startDate: '2026-09-01' },
    ],
    contracts: [
      { number: 'CT-2026-004', project: 'SANHUB + Training', value: 500000, status: 'ACTIVE', date: '2026-09-05' },
    ],
    invoices: [
      { number: 'INV-2026-004', amount: 500000, status: 'PAID', date: '2026-09-10' },
    ],
    documents: [
      { name: 'service_agreement_santech_team.pdf', type: 'Contract', date: '2026-09-05' },
    ],
  },
  {
    id: '5',
    kind: 'DELEGATION',
    crmStatus: 'LEAD',
    createdAt: '2026-09-15',
    delegationName: 'LA Tech Delegation',
    origin: 'Los Angeles, USA',
    orgRepresented: 'Silicon Valley Tech Alliance',
    visitPurpose: 'Exploring Rwanda tech ecosystem partnerships',
    visitDate: '2026-09-15',
    delegationRepName: 'Michael Johnson',
    delegationRepPhone: '+1-310-555-0100',
    delegationRepEmail: 'mjohnson@svta.org',
    delegationMembers: [
      { name: 'Sarah Connor',  phone: '+1-310-555-0101', role: 'CTO' },
      { name: 'David Lee',     phone: '+1-310-555-0102', role: 'Investor' },
      { name: 'Maria Garcia',  phone: '+1-310-555-0103', role: 'Partnerships Director' },
    ],
    totalInvoiced: 0,
    totalPaid: 0,
    timeline: [
      { id: 't1', type: 'FIELD_VISIT', date: '2026-09-14', title: 'Delegation arrived at Santech office',                   description: 'Welcomed delegation team. Office tour conducted.',                        addedBy: 'Admin' },
      { id: 't2', type: 'MEETING',     date: '2026-09-15', title: 'Full presentation of Santech products and services',     description: 'Comprehensive presentation covering all Santech solutions and case studies.', addedBy: 'Admin' },
      { id: 't3', type: 'NOTE',        date: '2026-09-15', title: 'Delegation interested in AI Solution and IoT',           description: 'Delegation very interested in AI Solution and IoT. Will discuss with their board.', addedBy: 'Admin' },
      { id: 't4', type: 'EMAIL',       date: '2026-09-20', title: 'Sent follow-up email with full product catalog and pricing', description: 'Product catalog and pricing sheet sent to Michael Johnson.',           addedBy: 'Admin' },
      { id: 't5', type: 'CALL',        date: '2026-10-01', title: 'Follow-up call — still under board review',             description: 'Michael confirmed board review ongoing. Expected decision by end of October.', addedBy: 'Alice Uwimana' },
    ],
    services: [
      { name: 'AI Solution',      description: 'Artificial intelligence integration', status: 'PENDING' },
      { name: 'IoT Solution',     description: 'Internet of Things systems',          status: 'PENDING' },
      { name: 'Custom Software',  description: 'Tailored software solution',          status: 'PENDING' },
    ],
    contracts: [],
    invoices: [],
    documents: [
      { name: 'santech_product_catalog.pdf', type: 'Proposal', date: '2026-09-20' },
    ],
  },
  {
    id: '6',
    kind: 'INDIVIDUAL',
    crmStatus: 'ACTIVE_CLIENT',
    createdAt: '2026-09-20',
    fullName: 'Claudine Uwase',
    phone: '0785300001',
    email: 'claudine@gmail.com',
    location: 'Musanze',
    idNumber: '1199870012345678',
    totalInvoiced: 350000,
    totalPaid: 350000,
    timeline: [
      { id: 't1', type: 'LEAD_CREATED', date: '2026-09-20', title: 'Claudine Uwase added as lead',                          description: 'Inquired about personal website for her boutique.',                       addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'CALL',         date: '2026-09-22', title: 'Discovery call — discussed website requirements',        description: 'Agreed on 3-page responsive website with photo gallery.',                 addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'CONTRACT',     date: '2026-09-25', title: 'Contract CT-2026-006 signed',                           description: 'Website development contract signed.',                                    addedBy: 'Admin' },
      { id: 't4', type: 'PAYMENT',      date: '2026-09-28', title: 'Full payment RWF 350,000 received',                    description: 'Client paid in full upfront via Mobile Money.',                          addedBy: 'Admin' },
    ],
    services: [
      { name: 'Website Development', description: 'Custom website design and development', status: 'ACTIVE', startDate: '2026-09-25', renewalDate: '2027-09-25' },
    ],
    contracts: [
      { number: 'CT-2026-006', project: 'Boutique Website', value: 350000, status: 'COMPLETED', date: '2026-09-25' },
    ],
    invoices: [
      { number: 'INV-2026-006', amount: 350000, status: 'PAID', date: '2026-09-28' },
    ],
    documents: [
      { name: 'contract_claudine.pdf', type: 'Contract', date: '2026-09-25' },
    ],
  },
  {
    id: '7',
    kind: 'BUSINESS',
    crmStatus: 'ACTIVE_CLIENT',
    createdAt: '2026-08-05',
    companyName: 'NYARUGENGE HOSPITAL',
    tinNumber: 'RW112233445',
    address: 'Nyarugenge, Kigali',
    repName: 'Lt Col William KANYANKORE',
    repPhone: '0788305785',
    repEmail: 'director@nyarugenge.rw',
    industry: 'Healthcare',
    totalInvoiced: 1200000,
    totalPaid: 600000,
    timeline: [
      { id: 't1', type: 'FIELD_VISIT',  date: '2026-07-20', title: 'Site visit to Nyarugenge Hospital',                     description: 'Assessed visitor management and entry control requirements.',              addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'MEETING',      date: '2026-07-28', title: 'EVS demo for hospital management team',                 description: 'Demonstrated EVS to director and IT team. Very impressed.',               addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'CONTRACT',     date: '2026-08-05', title: 'Contract CT-2026-007 signed for EVS',                   description: 'EVS implementation contract signed for main entrance and ICU.',          addedBy: 'Admin' },
      { id: 't4', type: 'INVOICE',      date: '2026-08-10', title: 'Invoice INV-2026-007 sent — RWF 600,000 (50% upfront)', description: 'First invoice issued for project start.',                                addedBy: 'Admin' },
      { id: 't5', type: 'PAYMENT',      date: '2026-08-15', title: 'Payment received RWF 600,000',                         description: 'First payment received. Implementation team deployed.',                  addedBy: 'Admin' },
    ],
    services: [
      { name: 'EVS (E-Visitors System)', description: 'Gate pass and visitor management', status: 'ACTIVE', startDate: '2026-08-05', renewalDate: '2027-08-05' },
    ],
    contracts: [
      { number: 'CT-2026-007', project: 'Hospital EVS Implementation', value: 1200000, status: 'ACTIVE', date: '2026-08-05' },
    ],
    invoices: [
      { number: 'INV-2026-007',  amount: 600000, status: 'PAID',   date: '2026-08-10' },
      { number: 'INV-2026-007b', amount: 600000, status: 'UNPAID', date: '2026-10-01' },
    ],
    documents: [
      { name: 'contract_nyarugenge_hospital.pdf', type: 'Contract', date: '2026-08-05' },
    ],
  },
  {
    id: '8',
    kind: 'TEAM',
    crmStatus: 'INACTIVE',
    createdAt: '2026-09-25',
    teamName: 'Ministry of ICT Innovation Team',
    orgName: 'Ministry of ICT Rwanda',
    teamLocation: 'Kigali',
    leaderName: 'Eng. Patrick Nkusi',
    leaderPhone: '0788400001',
    leaderEmail: 'p.nkusi@minict.gov.rw',
    members: [
      { name: 'Agnes Mutoni',  phone: '0788400002', role: 'Policy Analyst' },
      { name: 'Eric Habimana', phone: '0788400003', role: 'Tech Lead' },
    ],
    totalInvoiced: 0,
    totalPaid: 0,
    timeline: [
      { id: 't1', type: 'MEETING',      date: '2026-09-25', title: 'Initial meeting with Ministry of ICT team',             description: 'Discussed potential AI and Custom Software solutions for ministry.',      addedBy: 'Alice Uwimana' },
      { id: 't2', type: 'QUOTATION',    date: '2026-10-01', title: 'Quotation QT-2026-008 sent for AI + Custom Software',   description: 'Quotation sent covering AI integration and custom policy management system.', addedBy: 'Alice Uwimana' },
      { id: 't3', type: 'NOTE',         date: '2026-10-15', title: 'Procurement process initiated by ministry',             description: 'Ministry procurement office handling formal tender process.',             addedBy: 'Admin' },
    ],
    services: [
      { name: 'Custom Software', description: 'Tailored software solution', status: 'PENDING' },
      { name: 'AI Solution',     description: 'Artificial intelligence integration', status: 'PENDING' },
    ],
    contracts: [],
    invoices: [],
    documents: [
      { name: 'quotation_minict.pdf', type: 'Proposal', date: '2026-10-01' },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const KIND_STYLES: Record<ClientKind, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-700',
  BUSINESS:   'bg-green-100 text-green-700',
  TEAM:       'bg-purple-100 text-purple-700',
  DELEGATION: 'bg-orange-100 text-orange-700',
}

const KIND_LABELS: Record<ClientKind, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS:   'Business',
  TEAM:       'Team',
  DELEGATION: 'Delegation',
}

const CRM_STATUS_STYLES: Record<CRMStatus, string> = {
  PROSPECT:      'bg-gray-100 text-gray-600',
  LEAD:          'bg-blue-100 text-blue-700',
  NEGOTIATION:   'bg-yellow-100 text-yellow-700',
  ACTIVE_CLIENT: 'bg-green-100 text-green-700',
  RECURRING:     'bg-emerald-100 text-emerald-700',
  INACTIVE:      'bg-gray-100 text-gray-500',
  LOST:          'bg-red-100 text-red-700',
}

const CRM_STATUS_LABELS: Record<CRMStatus, string> = {
  PROSPECT:      'Prospect',
  LEAD:          'Lead',
  NEGOTIATION:   'Negotiation',
  ACTIVE_CLIENT: 'Active Client',
  RECURRING:     'Recurring',
  INACTIVE:      'Inactive',
  LOST:          'Lost',
}

const TIMELINE_CONFIG: Record<TimelineEventType, { icon: React.ElementType; color: string; dotColor: string; label: string }> = {
  FIELD_VISIT:   { icon: MapPin,       color: 'bg-blue-50 border-blue-200',    dotColor: 'bg-blue-500',    label: 'Field visit recorded' },
  LEAD_CREATED:  { icon: UserPlus,     color: 'bg-purple-50 border-purple-200', dotColor: 'bg-purple-500',  label: 'Added as lead' },
  CALL:          { icon: Phone,        color: 'bg-green-50 border-green-200',  dotColor: 'bg-green-500',   label: 'Phone call' },
  MEETING:       { icon: Users,        color: 'bg-teal-50 border-teal-200',    dotColor: 'bg-teal-500',    label: 'Meeting held' },
  EMAIL:         { icon: Mail,         color: 'bg-gray-50 border-gray-200',    dotColor: 'bg-gray-400',    label: 'Email sent' },
  QUOTATION:     { icon: FileText,     color: 'bg-amber-50 border-amber-200',  dotColor: 'bg-amber-500',   label: 'Quotation sent' },
  CONTRACT:      { icon: FileCheck,    color: 'bg-green-50 border-green-200',  dotColor: 'bg-green-600',   label: 'Contract signed' },
  INVOICE:       { icon: Receipt,      color: 'bg-blue-50 border-blue-200',    dotColor: 'bg-blue-500',    label: 'Invoice sent' },
  PAYMENT:       { icon: DollarSign,   color: 'bg-emerald-50 border-emerald-200', dotColor: 'bg-emerald-500', label: 'Payment received' },
  NOTE:          { icon: StickyNote,   color: 'bg-gray-50 border-gray-200',    dotColor: 'bg-gray-400',    label: 'Note added' },
  STATUS_CHANGE: { icon: RefreshCw,    color: 'bg-orange-50 border-orange-200', dotColor: 'bg-orange-500',  label: 'Status changed' },
  RENEWAL:       { icon: RefreshCw,    color: 'bg-teal-50 border-teal-200',    dotColor: 'bg-teal-500',    label: 'Service renewed' },
}

const SERVICE_STATUS_STYLES: Record<ServiceStatus, string> = {
  ACTIVE:  'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
}

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID:     'bg-green-100 text-green-700',
  UNPAID:   'bg-red-100 text-red-700',
  PARTIAL:  'bg-yellow-100 text-yellow-700',
  OVERDUE:  'bg-orange-100 text-orange-700',
}

// ─── Helper: get display name ────────────────────────────────────────────────
function getDisplayName(c: ClientProfile): string {
  if (c.kind === 'INDIVIDUAL')  return c.fullName ?? ''
  if (c.kind === 'BUSINESS')    return c.companyName ?? ''
  if (c.kind === 'TEAM')        return c.teamName ?? ''
  return c.delegationName ?? ''
}

// ─── Sub-component: Info Row ─────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 sm:w-32 shrink-0">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  )
}

// ─── Sub-component: Add Interaction Modal ────────────────────────────────────
type InteractionType = 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'STATUS_CHANGE'

interface AddInteractionModalProps {
  onClose: () => void
  onSave: (event: TimelineEvent) => void
}

function AddInteractionModal({ onClose, onSave }: AddInteractionModalProps) {
  const [type, setType] = useState<InteractionType>('CALL')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [addedBy, setAddedBy] = useState('')

  const handleSave = () => {
    if (!title.trim() || !date) return
    onSave({
      id: String(Date.now()),
      type,
      date,
      title: title.trim(),
      description: description.trim(),
      addedBy: addedBy.trim() || 'Admin',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">Add Interaction</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as InteractionType)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500">
              <option value="CALL">Call</option>
              <option value="MEETING">Meeting</option>
              <option value="EMAIL">Email</option>
              <option value="NOTE">Note</option>
              <option value="STATUS_CHANGE">Status Change</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Interaction title..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Details..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Added By</label>
            <input type="text" value={addedBy} onChange={e => setAddedBy(e.target.value)} placeholder="Your name..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-santech-500" />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave}
            className="flex-1 px-4 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [profile, setProfile] = useState<ClientProfile | undefined>(
    () => mockProfiles.find(p => p.id === id)
  )

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-gray-500 text-lg">Client not found.</p>
        <button onClick={() => navigate('/crm/customers')}
          className="flex items-center gap-2 text-sm text-santech-600 hover:text-santech-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>
      </div>
    )
  }

  const outstanding = profile.totalInvoiced - profile.totalPaid
  const profitMargin = profile.totalInvoiced > 0
    ? Math.round((profile.totalPaid / profile.totalInvoiced) * 100)
    : 0

  const handleAddInteraction = (event: TimelineEvent) => {
    setProfile(prev => prev ? { ...prev, timeline: [event, ...prev.timeline] } : prev)
    setShowAddInteraction(false)
  }

  const sortedTimeline = [...profile.timeline].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <button onClick={() => navigate('/crm/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-santech-100 flex items-center justify-center shrink-0">
              {profile.kind === 'INDIVIDUAL' && <User className="w-6 h-6 text-santech-600" />}
              {profile.kind === 'BUSINESS'   && <Building2 className="w-6 h-6 text-santech-600" />}
              {(profile.kind === 'TEAM' || profile.kind === 'DELEGATION') && <Users className="w-6 h-6 text-santech-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-800">{getDisplayName(profile)}</h1>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', KIND_STYLES[profile.kind])}>
                  {KIND_LABELS[profile.kind]}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CRM_STATUS_STYLES[profile.crmStatus])}>
                  {CRM_STATUS_LABELS[profile.crmStatus]}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">Added {formatDate(profile.createdAt)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button onClick={() => setShowAddInteraction(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-santech-600 text-white rounded-lg text-sm font-medium hover:bg-santech-700">
              <Plus className="w-4 h-4" /> Add Interaction
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4">
          <p className="text-xs text-gray-500">Total Invoiced</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(profile.totalInvoiced)}</p>
        </div>
        <div className="kpi-card p-4">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(profile.totalPaid)}</p>
        </div>
        <div className="kpi-card p-4">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className={cn('text-lg font-bold mt-1', outstanding > 0 ? 'text-red-600' : 'text-gray-400')}>
            {formatCurrency(outstanding)}
          </p>
        </div>
        <div className="kpi-card p-4">
          <p className="text-xs text-gray-500">Contracts</p>
          <p className="text-lg font-bold text-santech-600 mt-1">{profile.contracts.length}</p>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Client Information Card */}
          <div className="bms-card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Client Information</h2>

            {profile.kind === 'INDIVIDUAL' && (
              <div className="space-y-0.5">
                <InfoRow label="Full Name"   value={profile.fullName} />
                <InfoRow label="Phone"       value={profile.phone} />
                <InfoRow label="Email"       value={profile.email} />
                <InfoRow label="Location"    value={profile.location} />
                <InfoRow label="ID Number"   value={profile.idNumber} />
              </div>
            )}

            {profile.kind === 'BUSINESS' && (
              <div className="space-y-0.5">
                <InfoRow label="Company Name"    value={profile.companyName} />
                <InfoRow label="TIN Number"      value={profile.tinNumber} />
                <InfoRow label="Location"        value={profile.address} />
                <InfoRow label="Industry"        value={profile.industry} />
                <InfoRow label="Website"         value={profile.website} />
                <InfoRow label="Representative"  value={profile.repName} />
                <InfoRow label="Rep. Phone"      value={profile.repPhone} />
                <InfoRow label="Rep. Email"      value={profile.repEmail} />
              </div>
            )}

            {profile.kind === 'TEAM' && (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <InfoRow label="Team Name"    value={profile.teamName} />
                  <InfoRow label="Organization" value={profile.orgName} />
                  <InfoRow label="Location"     value={profile.teamLocation} />
                  <InfoRow label="Leader"       value={profile.leaderName} />
                  <InfoRow label="Leader Phone" value={profile.leaderPhone} />
                  <InfoRow label="Leader Email" value={profile.leaderEmail} />
                </div>
                {profile.members && profile.members.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Members ({profile.members.length})</p>
                    <div className="space-y-1.5">
                      {profile.members.map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.role} · {m.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.kind === 'DELEGATION' && (
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <InfoRow label="Delegation"       value={profile.delegationName} />
                  <InfoRow label="Origin"           value={profile.origin} />
                  <InfoRow label="Org. Represented" value={profile.orgRepresented} />
                  <InfoRow label="Visit Purpose"    value={profile.visitPurpose} />
                  <InfoRow label="Visit Date"       value={profile.visitDate ? formatDate(profile.visitDate) : undefined} />
                  <InfoRow label="Representative"   value={profile.delegationRepName} />
                  <InfoRow label="Rep. Phone"       value={profile.delegationRepPhone} />
                  <InfoRow label="Rep. Email"       value={profile.delegationRepEmail} />
                </div>
                {profile.delegationMembers && profile.delegationMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Members ({profile.delegationMembers.length})</p>
                    <div className="space-y-1.5">
                      {profile.delegationMembers.map((m, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-gray-700">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.role} · {m.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interaction Timeline */}
          <div className="bms-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Interaction Timeline</h2>
              <span className="text-xs text-gray-400">{profile.timeline.length} events</span>
            </div>

            {sortedTimeline.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No interactions recorded yet.</p>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-100" />
                <div className="space-y-4">
                  {sortedTimeline.map((event) => {
                    const config = TIMELINE_CONFIG[event.type]
                    const Icon = config.icon
                    return (
                      <div key={event.id} className="flex gap-3 relative">
                        {/* Dot */}
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm', config.dotColor)}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        {/* Card */}
                        <div className={cn('flex-1 rounded-lg border p-3 text-xs', config.color)}>
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 leading-snug">{event.title}</p>
                            <span className="text-gray-400 whitespace-nowrap shrink-0">{formatDate(event.date)}</span>
                          </div>
                          {event.description && (
                            <p className="text-gray-600 mt-1 leading-relaxed">{event.description}</p>
                          )}
                          <p className="text-gray-400 mt-1.5">By {event.addedBy}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Financial Summary */}
          <div className="bms-card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Financial Summary</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Invoiced</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(profile.totalInvoiced)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Paid</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatCurrency(profile.totalPaid)}</p>
              </div>
              <div className={cn('rounded-lg p-3', outstanding > 0 ? 'bg-red-50' : 'bg-gray-50')}>
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className={cn('text-sm font-bold mt-0.5', outstanding > 0 ? 'text-red-700' : 'text-gray-500')}>{formatCurrency(outstanding)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Collection Rate</p>
                <p className="text-sm font-bold text-blue-700 mt-0.5">{profitMargin}%</p>
              </div>
            </div>
            {profile.invoices.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Invoices</p>
                <div className="space-y-2">
                  {profile.invoices.map((inv, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{inv.number}</p>
                        <p className="text-xs text-gray-400">{formatDate(inv.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-700">{formatCurrency(inv.amount)}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INVOICE_STATUS_STYLES[inv.status])}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Services Used */}
          <div className="bms-card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Services</h2>
            {profile.services.length === 0 ? (
              <p className="text-xs text-gray-400">No services recorded.</p>
            ) : (
              <div className="space-y-2">
                {profile.services.map((svc, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{svc.name}</p>
                        {svc.description && <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>}
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', SERVICE_STATUS_STYLES[svc.status])}>
                        {svc.status}
                      </span>
                    </div>
                    {(svc.startDate || svc.renewalDate) && (
                      <div className="flex gap-3 mt-2">
                        {svc.startDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>Start: {formatDate(svc.startDate)}</span>
                          </div>
                        )}
                        {svc.renewalDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <RefreshCw className="w-3 h-3" />
                            <span>Renewal: {formatDate(svc.renewalDate)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contracts */}
          <div className="bms-card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Contracts</h2>
            {profile.contracts.length === 0 ? (
              <p className="text-xs text-gray-400">No contracts yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.contracts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{c.number}</p>
                      <p className="text-xs text-gray-500">{c.project}</p>
                      {c.date && <p className="text-xs text-gray-400">{formatDate(c.date)}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-xs font-bold text-gray-700">{formatCurrency(c.value)}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CONTRACT_STATUS_STYLES[c.status])}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bms-card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Documents</h2>
            {profile.documents.length === 0 ? (
              <p className="text-xs text-gray-400">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {profile.documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{doc.type}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatDate(doc.date)}</span>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 text-xs text-santech-600 hover:text-santech-700 font-medium px-2 py-1 rounded hover:bg-santech-50">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Interaction Modal */}
      {showAddInteraction && (
        <AddInteractionModal
          onClose={() => setShowAddInteraction(false)}
          onSave={handleAddInteraction}
        />
      )}
    </div>
  )
}
