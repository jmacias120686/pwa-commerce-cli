"use client"

import { Routes, Route, Navigate } from "react-router-dom"
import { AppShell } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { useAuth } from "./context/AuthContext"
import { useEffect } from "react"
import { initDB } from "./config/db"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import POSPage from "./pages/POSPage"
import ProductsPage from "./pages/ProductsPage"
import CustomersPage from "./pages/CustomersPage"
import SalesPage from "./pages/SalesPage"
import ReportsPage from "./pages/ReportsPage"
import UsersPage from "./pages/UsersPage"
import AppNavbar from "./components/AppNavbar"
import AppHeader from "./components/AppHeader"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
  const { isAuthenticated, loading } = useAuth()
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)

  useEffect(() => {
    initDB()
  }, [])

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <AppHeader
          mobileOpened={mobileOpened}
          desktopOpened={desktopOpened}
          toggleMobile={toggleMobile}
          toggleDesktop={toggleDesktop}
        />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppNavbar onNavigate={() => toggleMobile()} />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POSPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <SalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute adminOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
