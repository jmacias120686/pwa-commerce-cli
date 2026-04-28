"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Switch,
  Card,
  LoadingOverlay,
} from "@mantine/core"
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { useAuth } from "../context/AuthContext"

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "CASHIER",
    active: true,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await api.getUsers()
      setUsers(data)
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar usuarios",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      email: "",
      password: "",
      name: "",
      role: "CASHIER",
      active: true,
    })
    setModalOpened(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
      active: user.active,
    })
    setModalOpened(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: formData.name,
          role: formData.role,
          active: formData.active,
        })
        notifications.show({
          title: "Éxito",
          message: "Usuario actualizado correctamente",
          color: "green",
        })
      } else {
        if (!formData.password || formData.password.length < 6) {
          notifications.show({
            title: "Error",
            message: "La contraseña debe tener al menos 6 caracteres",
            color: "red",
          })
          return
        }

        await api.createUser(formData)
        notifications.show({
          title: "Éxito",
          message: "Usuario creado correctamente",
          color: "green",
        })
      }

      setModalOpened(false)
      loadUsers()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al guardar usuario",
        color: "red",
      })
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm("¿Estás seguro de desactivar este usuario?")) return

    try {
      await api.deleteUser(userId)
      notifications.show({
        title: "Éxito",
        message: "Usuario desactivado correctamente",
        color: "green",
      })
      loadUsers()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al desactivar usuario",
        color: "red",
      })
    }
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Gestión de Usuarios
          </Text>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Nuevo Usuario
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <LoadingOverlay visible={loading} />

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>{user.name}</Table.Td>
                  <Table.Td>{user.email}</Table.Td>
                  <Table.Td>
                    <Badge color={user.role === "ADMIN" ? "red" : "blue"}>{user.role}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.active ? "green" : "gray"}>{user.active ? "Activo" : "Inactivo"}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon variant="light" color="blue" onClick={() => openEditModal(user)}>
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser.id}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {users.length === 0 && !loading && (
            <Text ta="center" c="dimmed" py="xl">
              No hay usuarios registrados
            </Text>
          )}
        </Card>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Nombre"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <TextInput
              label="Email"
              type="email"
              required
              disabled={!!editingUser}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {!editingUser && (
              <TextInput
                label="Contraseña"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                description="Mínimo 6 caracteres"
              />
            )}

            <Select
              label="Rol"
              required
              value={formData.role}
              onChange={(value) => setFormData({ ...formData, role: value })}
              data={[
                { value: "ADMIN", label: "Administrador" },
                { value: "CASHIER", label: "Cajero" },
              ]}
            />

            {editingUser && (
              <Switch
                label="Usuario activo"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.currentTarget.checked })}
              />
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpened(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingUser ? "Actualizar" : "Crear"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
