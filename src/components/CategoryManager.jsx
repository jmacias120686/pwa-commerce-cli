"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  Table,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Card,
  LoadingOverlay,
  Badge,
} from "@mantine/core"
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { db } from "../config/db"
import { useAuth } from "../context/AuthContext"
import { useSync } from "../context/SyncContext"

export default function CategoryManager() {
  const { isAdmin } = useAuth()
  const { isOnline, syncCategories } = useSync()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    loadCategories()
  }, [isOnline])

  const loadCategories = async () => {
    try {
      setLoading(true)
      if (isOnline) {
        try {
          const data = await api.getCategories()
          setCategories(data)
          await db.categories.clear()
          await db.categories.bulkPut(data)
        } catch (error) {
          console.warn("[CategoryManager] Error fetching server data, using local cache:", error)
          const data = await db.categories.toArray()
          setCategories(data)
          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, cargando categorías locales",
            color: "orange",
          })
        }
      } else {
        const data = await db.categories.toArray()
        setCategories(data)
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar categorías",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      description: "",
    })
    setModalOpened(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
    })
    setModalOpened(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (!isOnline) {
        const localId = editingCategory?.id || `local-category-${Date.now()}`
        const categoryData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-category-"),
        }

        await db.categories.put(categoryData)
        await db.syncQueue.add({
          type: "category",
          action: editingCategory ? "update" : "create",
          data: categoryData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingCategory ? "Categoría actualizada localmente" : "Categoría creada localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadCategories()
        return
      }

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData)
        notifications.show({
          title: "Éxito",
          message: "Categoría actualizada correctamente",
          color: "green",
        })
      } else {
        await api.createCategory(formData)
        notifications.show({
          title: "Éxito",
          message: "Categoría creada correctamente",
          color: "green",
        })
      }

      setModalOpened(false)
      await loadCategories()
      await syncCategories()
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        const localId = editingCategory?.id || `local-category-${Date.now()}`
        const categoryData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-category-"),
        }

        await db.categories.put(categoryData)
        await db.syncQueue.add({
          type: "category",
          action: editingCategory ? "update" : "create",
          data: categoryData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingCategory ? "Categoría actualizada localmente" : "Categoría creada localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadCategories()
      } else {
        notifications.show({
          title: "Error",
          message: error.message || "Error al guardar categoría",
          color: "red",
        })
      }
    }
  }

  const handleDelete = async (categoryId) => {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return

    try {
      if (!isOnline) {
        await db.categories.delete(categoryId)
        await db.syncQueue.add({
          type: "category",
          action: "delete",
          data: { id: categoryId },
          timestamp: Date.now(),
        })
        notifications.show({
          title: "Guardado offline",
          message: "Categoría eliminada localmente. Se sincronizará cuando haya conexión.",
          color: "blue",
        })
        await loadCategories()
        return
      }

      await api.deleteCategory(categoryId)
      notifications.show({
        title: "Éxito",
        message: "Categoría eliminada correctamente",
        color: "green",
      })
      await loadCategories()
      await syncCategories()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al eliminar categoría",
        color: "red",
      })
    }
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Gestión de Categorías
          </Text>
          {isAdmin() && (
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Nueva Categoría
            </Button>
          )}
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <LoadingOverlay visible={loading} />

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre</Table.Th>
                <Table.Th>Descripción</Table.Th>
                <Table.Th>Productos</Table.Th>
                {isAdmin() && <Table.Th>Acciones</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.map((category) => (
                <Table.Tr key={category.id}>
                  <Table.Td>
                    <Text fw={500}>{category.name}</Text>
                  </Table.Td>
                  <Table.Td>{category.description || "-"}</Table.Td>
                  <Table.Td>
                    <Badge>{category._count?.products || 0}</Badge>
                  </Table.Td>
                  {isAdmin() && (
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => openEditModal(category)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(category.id)}
                          disabled={(category._count?.products || 0) > 0}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {categories.length === 0 && !loading && (
            <Text ta="center" c="dimmed" py="xl">
              No hay categorías registradas
            </Text>
          )}
        </Card>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}
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

            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpened(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingCategory ? "Actualizar" : "Crear"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
