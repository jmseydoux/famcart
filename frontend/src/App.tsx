import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth } from './components/ProtectedRoute'
import Layout from './components/Layout'
import HouseholdLayout from './components/HouseholdLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import HouseholdView from './pages/HouseholdView'
import ShoppingListView from './pages/ShoppingListView'
import ShoppingMode from './pages/ShoppingMode'
import ProductCatalog from './pages/ProductCatalog'
import History from './pages/History'
import HouseholdSettings from './pages/HouseholdSettings'
import Admin from './pages/Admin'
import About from './pages/About'
import DbStatus from './pages/DbStatus'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Standalone (no household) */}
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route index element={<Home />} />
              <Route path="admin" element={<Admin />} />
              <Route path="about" element={<About />} />
              <Route path="db-status" element={<DbStatus />} />
            </Route>

            {/* Household context with bottom nav */}
            <Route
              path="household/:hid"
              element={
                <RequireAuth>
                  <HouseholdLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="lists" replace />} />
              <Route path="lists" element={<HouseholdView />} />
              <Route path="lists/:lid" element={<ShoppingListView />} />
              <Route path="lists/:lid/shop" element={<ShoppingMode />} />
              <Route path="products" element={<ProductCatalog />} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<HouseholdSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
