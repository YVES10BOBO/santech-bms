import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'

// Layouts
import MainLayout from '@/components/layout/MainLayout'
import AuthLayout from '@/components/layout/AuthLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'

// Main pages
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/crm/CustomersPage'
import LeadsPage from '@/pages/crm/LeadsPage'
import FieldVisitsPage from '@/pages/crm/FieldVisitsPage'
import PipelinePage from '@/pages/sales/PipelinePage'
import QuotationsPage from '@/pages/sales/QuotationsPage'
import ProjectsPage from '@/pages/projects/ProjectsPage'
import TasksPage from '@/pages/projects/TasksPage'
import EmployeesPage from '@/pages/team/EmployeesPage'
import MyTasksPage from '@/pages/team/MyTasksPage'
import DepartmentsPage from '@/pages/team/DepartmentsPage'
import SalaryPage from '@/pages/team/SalaryPage'
import ContractsPage from '@/pages/contracts/ContractsPage'
import ClientServicesPage from '@/pages/contracts/ClientServicesPage'
import InvoicesPage from '@/pages/finance/InvoicesPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import AuditTrailPage from '@/pages/settings/AuditTrailPage'
import FinancePage from '@/pages/finance/FinancePage'
import ReportsPage from '@/pages/reports/ReportsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import SupportPage from '@/pages/support/SupportPage'
import TrainingPage from '@/pages/training/TrainingPage'
import ProductCatalogPage from '@/pages/settings/ProductCatalogPage'
import ClientProfilePage from '@/pages/crm/ClientProfilePage'
import WorkloadPage from '@/pages/team/WorkloadPage'
import AttendancePage from '@/pages/team/AttendancePage'
import CampaignsPage from '@/pages/marketing/CampaignsPage'
import MilestonesPage from '@/pages/projects/MilestonesPage'
import MeetingsPage from '@/pages/communication/MeetingsPage'
import CommunicationPage from '@/pages/communication/CommunicationPage'
import ReceptionPage from '@/pages/reception/ReceptionPage'

// Guard: requires authentication
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

// Guard: redirect to dashboard if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1e293b',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* CRM */}
          <Route path="crm/customers" element={<CustomersPage />} />
          <Route path="crm/leads" element={<LeadsPage />} />
          <Route path="crm/field-visits" element={<FieldVisitsPage />} />
          <Route path="crm/clients/:id" element={<ClientProfilePage />} />

          {/* Sales */}
          <Route path="sales/pipeline" element={<PipelinePage />} />
          <Route path="sales/quotations" element={<QuotationsPage />} />

          {/* Marketing */}
          <Route path="marketing/campaigns" element={<CampaignsPage />} />

          {/* Projects */}
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/tasks" element={<TasksPage />} />
          <Route path="projects/milestones" element={<MilestonesPage />} />
          <Route path="communication/meetings" element={<MeetingsPage />} />
          <Route path="communication/log" element={<CommunicationPage />} />
          <Route path="reception" element={<ReceptionPage />} />

          {/* Team */}
          <Route path="team/employees" element={<EmployeesPage />} />
          <Route path="team/departments" element={<DepartmentsPage />} />
          <Route path="team/my-tasks" element={<MyTasksPage />} />
          <Route path="team/salary" element={<SalaryPage />} />
          <Route path="team/workload" element={<WorkloadPage />} />
          <Route path="team/attendance" element={<AttendancePage />} />

          {/* Contracts */}
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="contracts/services" element={<ClientServicesPage />} />

          {/* Finance */}
          {/* Finance P&L — override the existing /finance route to use FinancePage */}
          <Route path="finance" element={<FinancePage />} />
          {/* Keep the invoices sub-route */}
          <Route path="finance/invoices" element={<InvoicesPage />} />

          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/users" element={<SettingsPage />} />
          <Route path="settings/company" element={<SettingsPage />} />
          <Route path="settings/roles" element={<SettingsPage />} />
          <Route path="settings/config" element={<SettingsPage />} />

          {/* New pages */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="settings/products" element={<ProductCatalogPage />} />
          <Route path="settings/audit" element={<AuditTrailPage />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}
