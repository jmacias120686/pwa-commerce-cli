"use client"

import { useState } from "react"
import { Container, Paper, Title, TextInput, PasswordInput, Button, Stack, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(credentials)

      if (!result.success) {
        notifications.show({
          title: "Error",
          message: result.error || "Credenciales inválidas",
          color: "red",
        })
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al iniciar sesión",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size={420} my={100}>
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mb="md">
          PWA Commerce
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Sistema de Punto de Venta
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
            />

            <Button type="submit" fullWidth loading={loading}>
              Iniciar Sesión
            </Button>
          </Stack>
        </form>

        <Text size="xs" c="dimmed" mt="xl" ta="center">
          Demo: admin@tienda.com / 123456
        </Text>
      </Paper>
    </Container>
  )
}
