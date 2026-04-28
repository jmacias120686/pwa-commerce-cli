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
  Card,
  LoadingOverlay,
  Badge,
} from "@mantine/core"
import { IconPlus, IconPencil, IconTrash, IconSearch, IconEye } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { useSync } from "../context/SyncContext"
import { db } from "../config/db"

export default function CustomersPage() {
  const { isOnline, syncCustomers } = useSync()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [detailModalOpened, setDetailModalOpened] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  })

  useEffect(() => {
    loadCustomers()
  }, [isOnline])

  const loadCustomers = async () => {
    try {
      setLoading(true)

      if (isOnline) {
        try {
          const data = await api.getCustomers()
          setCustomers(data)

          await db.customers.clear()
          await db.customers.bulkPut(data)
        } catch (error) {
          console.warn("[CustomersPage] Error fetching customers, using local cache", error)
          const data = await db.customers.toArray()
          setCustomers(data)
          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, cargando clientes locales",
            color: "orange",
          })
        }
      } else {
        const data = await db.customers.toArray()
        setCustomers(data)
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar clientes",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingCustomer(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
    })
    setModalOpened(true)
  }

  const openEditModal = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    })
    setModalOpened(true)
  }

  const openDetailModal = async (customer) => {
    if (!isOnline) {
      const localCustomer = await db.customers.where("id").equals(customer.id).first()
      if (localCustomer) {
        setSelectedCustomer(localCustomer)
        setDetailModalOpened(true)
        return
      }
      notifications.show({
        title: "Sin conexión",
        message: "Necesitas conexión para ver detalles",
        color: "orange",
      })
      return
    }

    try {
      const data = await api.getCustomer(customer.id)
      setSelectedCustomer(data)
      setDetailModalOpened(true)
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar detalles del cliente",
        color: "red",
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (!isOnline) {
        const localId = editingCustomer?.id || `local-customer-${Date.now()}`
        const customerData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-customer-"),
        }

        await db.customers.put(customerData)
        await db.syncQueue.add({
          type: "customer",
          action: editingCustomer ? "update" : "create",
          data: customerData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingCustomer ? "Cliente actualizado localmente" : "Cliente creado localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadCustomers()
        return
      }

      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData)
        notifications.show({
          title: "Éxito",
          message: "Cliente actualizado correctamente",
          color: "green",
        })
      } else {
        await api.createCustomer(formData)
        notifications.show({
          title: "Éxito",
          message: "Cliente creado correctamente",
          color: "green",
        })
      }

      setModalOpened(false)
      await loadCustomers()
      await syncCustomers()
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        const localId = editingCustomer?.id || `local-customer-${Date.now()}`
        const customerData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-customer-"),
        }

        await db.customers.put(customerData)
        await db.syncQueue.add({
          type: "customer",
          action: editingCustomer ? "update" : "create",
          data: customerData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingCustomer ? "Cliente actualizado localmente" : "Cliente creado localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadCustomers()
      } else {
        notifications.show({
          title: "Error",
          message: error.message || "Error al guardar cliente",
          color: "red",
        })
      }
    }
  }

  const handleDelete = async (customerId) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return

    try {
      if (!isOnline) {
        await db.customers.delete(customerId)
        await db.syncQueue.add({
          type: "customer",
          action: "delete",
          data: { id: customerId },
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: "Cliente eliminado localmente. Se sincronizará cuando haya conexión.",
          color: "blue",
        })

        await loadCustomers()
        return
      }

      await api.deleteCustomer(customerId)
      notifications.show({
        title: "Éxito",
        message: "Cliente eliminado correctamente",
        color: "green",
      })
      await loadCustomers()
      await syncCustomers()
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        await db.customers.delete(customerId)
        await db.syncQueue.add({
          type: "customer",
          action: "delete",
          data: { id: customerId },
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: "Cliente eliminado localmente. Se sincronizará cuando haya conexión.",
          color: "blue",
        })

        await loadCustomers()
      } else {
        notifications.show({
          title: "Error",
          message: "Error al eliminar cliente",
          color: "red",
        })
      }
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm),
  )

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Gestión de Clientes
          </Text>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Nuevo Cliente
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack>
            <TextInput
              placeholder="Buscar por nombre, email o teléfono..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <LoadingOverlay visible={loading} />

            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nombre</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Teléfono</Table.Th>
                    <Table.Th>Compras</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredCustomers.map((customer) => (
                    <Table.Tr key={customer.id}>
                      <Table.Td>
                        <Text fw={500}>{customer.name}</Text>
                      </Table.Td>
                      <Table.Td>{customer.email || "-"}</Table.Td>
                      <Table.Td>{customer.phone || "-"}</Table.Td>
                      <Table.Td>
                        <Badge>{customer._count?.sales || 0}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="cyan"
                            onClick={() => openDetailModal(customer)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openEditModal(customer)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            {filteredCustomers.length === 0 && !loading && (
              <Text ta="center" c="dimmed" py="xl">
                No se encontraron clientes
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <TextInput
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />

            <TextInput
              label="Dirección"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpened(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingCustomer ? "Actualizar" : "Crear"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        title="Detalles del Cliente"
        size="lg"
        centered
      >
        {selectedCustomer && (
          <Stack>
            <Card withBorder padding="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={500}>Nombre:</Text>
                  <Text>{selectedCustomer.name}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Email:</Text>
                  <Text>{selectedCustomer.email || "-"}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Teléfono:</Text>
                  <Text>{selectedCustomer.phone || "-"}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Dirección:</Text>
                  <Text>{selectedCustomer.address || "-"}</Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Total de Compras:</Text>
                  <Badge size="lg">{selectedCustomer.sales?.length || 0}</Badge>
                </Group>
              </Stack>
            </Card>

            {selectedCustomer.sales && selectedCustomer.sales.length > 0 && (
              <>
                <Text fw={700} mt="md">
                  Últimas Compras
                </Text>
                <Stack gap="xs">
                  {selectedCustomer.sales.map((sale) => (
                    <Card key={sale.id} withBorder padding="sm">
                      <Group justify="space-between">
                        <div>
                          <Text size="sm" fw={500}>
                            {sale.saleNumber}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </Text>
                        </div>
                        <Text fw={700}>${sale.total.toFixed(2)}</Text>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </>
  )
}
