"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../config/api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (!token) {
      setLoading(false)
      return
    }

    // Si estamos offline, usar datos guardados localmente
    if (!navigator.onLine && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsAuthenticated(true)
        console.log("[Auth] Sesión offline restaurada")
      } catch (error) {
        console.error("[Auth] Error parseando usuario guardado:", error)
        logout()
      }
      setLoading(false)
      return
    }

    try {
      api.setToken(token)
      const userData = await api.getProfile()
      setUser(userData)
      setIsAuthenticated(true)
      // Guardar user para uso offline
      localStorage.setItem("user", JSON.stringify(userData))
    } catch (error) {
      console.error("[Auth] Error verificando autenticación:", error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await api.login(credentials)
      api.setToken(response.token)
      setUser(response.user)
      setIsAuthenticated(true)
      // Guardar user para uso offline
      localStorage.setItem("user", JSON.stringify(response.user))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    api.setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }

  const isAdmin = () => {
    return user?.role === "ADMIN"
  }

  const isCashier = () => {
    return user?.role === "CASHIER"
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        isAdmin,
        isCashier,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return context
}
