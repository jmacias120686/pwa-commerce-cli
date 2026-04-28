"use client"

import { Navigate } from "react-router-dom"
import { LoadingOverlay } from "@mantine/core"
import { useAuth } from "../context/AuthContext"

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin } = useAuth()

  if (loading) {
    return <LoadingOverlay visible />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />
  }

  return children
}
