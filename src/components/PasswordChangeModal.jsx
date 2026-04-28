"use client"

import { Modal, Stack, PasswordInput, Button } from "@mantine/core"
import { useState } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"

export default function PasswordChangeModal({ opened, onClose }) {
  const [loading, setLoading] = useState(false)
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (passwords.newPassword !== passwords.confirmPassword) {
      notifications.show({
        title: "Error",
        message: "Las contraseñas no coinciden",
        color: "red",
      })
      return
    }

    if (passwords.newPassword.length < 6) {
      notifications.show({
        title: "Error",
        message: "La contraseña debe tener al menos 6 caracteres",
        color: "red",
      })
      return
    }

    setLoading(true)

    try {
      await api.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })

      notifications.show({
        title: "Éxito",
        message: "Contraseña actualizada correctamente",
        color: "green",
      })

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      onClose()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al cambiar la contraseña",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Cambiar Contraseña" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <PasswordInput
            label="Contraseña Actual"
            required
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          />

          <PasswordInput
            label="Nueva Contraseña"
            required
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          />

          <PasswordInput
            label="Confirmar Nueva Contraseña"
            required
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
          />

          <Button type="submit" fullWidth loading={loading}>
            Cambiar Contraseña
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}
