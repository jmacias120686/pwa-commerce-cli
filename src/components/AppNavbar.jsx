"use client"

import { Stack, NavLink } from "@mantine/core"
import {
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconUsers,
  IconReceipt,
  IconChartBar,
  IconUserCog,
} from "@tabler/icons-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function AppNavbar({ onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuth()

  const handleNavigate = (path) => {
    navigate(path)
    onNavigate?.()
  }

  const menuItems = [
    { path: "/", label: "Dashboard", icon: IconDashboard },
    { path: "/pos", label: "Punto de Venta", icon: IconShoppingCart },
    { path: "/products", label: "Productos", icon: IconPackage },
    { path: "/customers", label: "Clientes", icon: IconUsers },
    { path: "/sales", label: "Ventas", icon: IconReceipt },
    { path: "/reports", label: "Reportes", icon: IconChartBar },
  ]

  if (isAdmin()) {
    menuItems.push({ path: "/users", label: "Usuarios", icon: IconUserCog })
  }

  return (
    <Stack gap="xs">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          label={item.label}
          leftSection={<item.icon size={20} stroke={1.5} />}
          active={location.pathname === item.path}
          onClick={() => handleNavigate(item.path)}
          variant="filled"
        />
      ))}
    </Stack>
  )
}
