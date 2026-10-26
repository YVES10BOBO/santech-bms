// ============================================================
// SANTECH BMS — Core Type Definitions
// ============================================================

// --- Auth & Users ---
export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE_MANAGER'
  | 'SALES_MANAGER'
  | 'MARKETING_MANAGER'
  | 'PROJECT_MANAGER'
  | 'SALES_STAFF'
  | 'EMPLOYEE'
  | 'CUSTOMER';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  position?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// --- Clients / Customers ---
export type ClientCategory = 'SELF_EMPLOYED' | 'INSTITUTION' | 'INDUSTRY' | 'DISTRIBUTOR';
export type ClientStatus = 'PROSPECT' | 'LEAD' | 'QUALIFIED' | 'CONTRACTOR' | 'INACTIVE' | 'LOST';
export type ClientType = 'CONTRACTOR' | 'ACQUISITION';

export interface Client {
  id: string;
  companyName: string;
  category: ClientCategory;
  status: ClientStatus;
  clientType: ClientType;
  registrationNumber?: string;
  address?: string;
  location?: string;
  phone: string;
  email?: string;
  website?: string;
  industry?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  assignedTo?: User;
  assignedToId?: string;
  notes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Field Visits (from Excel) ---
export type VisitOutcome = 'PENDING' | 'FOLLOW_UP' | 'INTERESTED' | 'NOT_INTERESTED' | 'WON' | 'LOST' | 'NEGOTIATION' | 'PROPOSAL';

export interface FieldVisit {
  id: string;
  visitDate: string;
  companyName: string;
  category: ClientCategory;
  location?: string;
  contactName?: string;
  contactPhone: string;
  contactEmail?: string;
  needsAndObservation: string;
  whatSantechCanSell: string;   // EVS, SANTRACK, REVIXSAN, Website, etc.
  outcome: VisitOutcome;
  followUpDate?: string;
  finalDecision?: string;
  comments?: string;
  amountPromising?: number;     // Estimated deal value (RWF)
  contractWon: boolean;
  recordedBy: User;
  recordedById: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Products / Services ---
export type ProductCategory =
  | 'EVS'
  | 'SANTRACK'
  | 'REVIXSAN'
  | 'SANBOOK'
  | 'SANHUB'
  | 'WEBSITE'
  | 'MOBILE_APP'
  | 'CRM'
  | 'ERP'
  | 'AI_SOLUTION'
  | 'IOT'
  | 'TRAINING'
  | 'CONSULTANCY'
  | 'MAINTENANCE'
  | 'OTHER';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description?: string;
  price: number;
  cost?: number;
  taxRate?: number;
  currency: string;
  isActive: boolean;
}

// --- Sales Pipeline ---
export type PipelineStage =
  | 'NEW_LEAD'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'REQUIREMENT_ANALYSIS'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export interface Opportunity {
  id: string;
  name: string;
  client: Client;
  clientId: string;
  stage: PipelineStage;
  estimatedValue: number;
  currency: string;
  probability: number;        // 0-100
  expectedCloseDate?: string;
  assignedTo: User;
  assignedToId: string;
  products: Product[];
  notes?: string;
  nextAction?: string;
  followUpDate?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Contracts ---
export type ContractStatus = 'DRAFT' | 'REVIEW' | 'APPROVAL' | 'SIGNING' | 'ACTIVE' | 'RENEWAL' | 'COMPLETED' | 'CANCELLED';

export interface Contract {
  id: string;
  contractNumber: string;
  client: Client;
  clientId: string;
  projectName?: string;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  paymentTerms?: string;
  deliverables?: string;
  status: ContractStatus;
  responsibleManager?: User;
  signedAt?: string;
  signedDocumentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Invoices & Payments ---
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: Client;
  clientId: string;
  contractId?: string;
  projectId?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Projects ---
export type ProjectStatus =
  | 'PLANNING'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'AT_RISK'
  | 'DELAYED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  client: Client;
  clientId: string;
  contractId?: string;
  projectManager: User;
  projectManagerId: string;
  team: User[];
  budget: number;
  contractValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: ProjectStatus;
  progress: number;            // 0-100
  description?: string;
  risks?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Tasks ---
export type TaskStatus = 'CREATED' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface Task {
  id: string;
  title: string;
  description?: string;
  project?: Project;
  projectId?: string;
  assignedTo: User;
  assignedToId: string;
  assignedBy: User;
  assignedById: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: string;
  deadline: string;
  estimatedHours?: number;
  actualHours?: number;
  status: TaskStatus;
  rejectionReason?: string;
  completedAt?: string;
  approvedAt?: string;
  approvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

// --- Employees ---
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';

export interface Employee {
  id: string;
  user: User;
  userId: string;
  employeeCode: string;
  department: string;
  position: string;
  hireDate: string;
  employmentStatus: EmploymentStatus;
  baseSalary: number;
  currency: string;
  performanceScore: number;
  skills?: string[];
  manager?: Employee;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Salary ---
export interface SalaryRecord {
  id: string;
  employee: Employee;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
  currency: string;
  isPaid: boolean;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

// --- Dashboard KPIs ---
export interface DashboardKPIs {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  totalLeads: number;
  conversionRate: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  pendingInvoices: number;
  overduePayments: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  outstandingReceivables: number;
  pendingTasks: number;
  fieldVisitsThisMonth: number;
}

// --- API Response ---
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
