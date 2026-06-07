import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { RequireAuth, RequireHousehold } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Setup from './pages/Setup'
import Home from './pages/Home'
import ListDetail from './pages/ListDetail'
import History from './pages/History'
import About from './pages/About'
import DbStatus from './pages/DbStatus'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Authenticated but no household yet */}
            <Route
              path="/setup"
              element={
                <RequireAuth>
                  <Setup />
                </RequireAuth>
              }
            />

            {/* Protected app routes */}
            <Route
              element={
                <RequireAuth>
                  <RequireHousehold>
                    <Layout />
                  </RequireHousehold>
                </RequireAuth>
              }
            >
              <Route index element={<Home />} />
              <Route path="lists/:id" element={<ListDetail />} />
              <Route path="history" element={<History />} />
              <Route path="about" element={<About />} />
              <Route path="db-status" element={<DbStatus />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
