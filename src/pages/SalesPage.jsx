"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  Table,
  Badge,
  Card,
  LoadingOverlay,
  Modal,
  Grid,
  Select,
  ActionIcon,
} from "@mantine/core"
import { IconEye, IconX, IconRefresh } from "@tabler/icons-react"
import { DatePickerInput } from "@mantine/dates"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { useAuth } from "../context/AuthContext"
import { useSync } from "../context/SyncContext"
import { db } from "../config/db"

export default function SalesPage() {
  const { isAdmin } = useAuth()
  const { isOnline } = useSync()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailModalOpened, setDetailModalOpened] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [dateRange, setDateRange] = useState([null, null])
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    loadSales()
  }, [isOnline, statusFilter])

  const loadSales = async () => {
    try {
      setLoading(true)
      const params = {}

      if (dateRange[0]) params.startDate = dateRange[0].toISOString()
      if (dateRange[1]) params.endDate = dateRange[1].toISOString()
      if (statusFilter) params.status = statusFilter

      if (isOnline) {
        try {
          const data = await api.getSales(params)
          setSales(data)
          await db.sales.clear()
          await db.sales.bulkPut(data)
        } catch (error) {
          console.warn("[SalesPage] Error fetching sales, using local cache", error)
          const data = await db.sales.toArray()
          setSales(data)
          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, mostrando ventas locales",
            color: "orange",
          })
        }
      } else {
        const data = await db.sales.toArray()
        setSales(data)
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar ventas",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const openDetailModal = async (sale) => {
    try {
      if (!isOnline) {
        const localSale = await db.sales.where("id").equals(sale.id).first()
        if (localSale) {
          const items = await db.saleItems.where("saleLocalId").equals(localSale.localId).toArray()
          setSelectedSale({ ...localSale, items })
          setDetailModalOpened(true)
          return
        }
      }

      const data = await api.getSale(sale.id)
      setSelectedSale(data)
      setDetailModalOpened(true)
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar detalles de la venta",
        color: "red",
      })
    }
  }

  const handleCancelSale = async (saleId) => {
    if (!confirm("¿Estás seguro de cancelar esta venta?")) return

    try {
      await api.cancelSale(saleId)
      notifications.show({
        title: "Éxito",
        message: "Venta cancelada correctamente",
        color: "green",
      })
      loadSales()
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cancelar venta",
        color: "red",
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "green"
      case "PENDING":
        return "yellow"
      case "CANCELLED":
        return "red"
      default:
        return "gray"
    }
  }

  const getPaymentMethodLabel = (method) => {
    const labels = {
      CASH: "Efectivo",
      CARD: "Tarjeta",
      TRANSFER: "Transferencia",
      OTHER: "Otro",
    }
    return labels[method] || method
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Historial de Ventas
          </Text>
          <Button leftSection={<IconRefresh size={16} />} onClick={loadSales} disabled={!isOnline}>
            Actualizar
          </Button>
        </Group>

        {!isOnline && (
          <Card withBorder bg="orange.0" padding="md">
            <Text size="sm">Necesitas conexión para ver el historial de ventas</Text>
          </Card>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <DatePickerInput
                  type="range"
                  label="Rango de fechas"
                  placeholder="Seleccionar rango"
                  value={dateRange}
                  onChange={setDateRange}
                  clearable
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Estado"
                  placeholder="Todos"
                  data={[
                    { value: "", label: "Todos" },
                    { value: "COMPLETED", label: "Completada" },
                    { value: "PENDING", label: "Pendiente" },
                    { value: "CANCELLED", label: "Cancelada" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  clearable
                />
              </Grid.Col>
            </Grid>

            <LoadingOverlay visible={loading} />

            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Número</Table.Th>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Cajero</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th>Pago</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sales.map((sale) => (
                    <Table.Tr key={sale.id}>
                      <Table.Td>
                        <Text fw={500}>{sale.saleNumber}</Text>
                      </Table.Td>
                      <Table.Td>{new Date(sale.createdAt).toLocaleString()}</Table.Td>
                      <Table.Td>{sale.customer?.name || "Sin cliente"}</Table.Td>
                      <Table.Td>{sale.user?.name}</Table.Td>
                      <Table.Td>
                        <Text fw={700}>${sale.total.toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{getPaymentMethodLabel(sale.paymentMethod)}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(sale.status)}>{sale.status}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="light" color="blue" onClick={() => openDetailModal(sale)}>
                            <IconEye size={16} />
                          </ActionIcon>
                          {isAdmin() && sale.status === "COMPLETED" && (
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleCancelSale(sale.id)}
                              disabled={!isOnline}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            {sales.length === 0 && !loading && (
              <Text ta="center" c="dimmed" py="xl">
                No se encontraron ventas
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        title="Detalles de la Venta"
        size="lg"
        centered
      >
        {selectedSale && (
          <Stack>
            <Card withBorder padding="md">
              <Grid>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Número de Venta
                  </Text>
                  <Text fw={700}>{selectedSale.saleNumber}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Estado
                  </Text>
                  <Badge color={getStatusColor(selectedSale.status)}>{selectedSale.status}</Badge>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Fecha
                  </Text>
                  <Text>{new Date(selectedSale.createdAt).toLocaleString()}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Método de Pago
                  </Text>
                  <Text>{getPaymentMethodLabel(selectedSale.paymentMethod)}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Cajero
                  </Text>
                  <Text>{selectedSale.user?.name}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Cliente
                  </Text>
                  <Text>{selectedSale.customer?.name || "Sin cliente"}</Text>
                </Grid.Col>
              </Grid>
            </Card>

            <Text fw={700}>Productos</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Producto</Table.Th>
                  <Table.Th>Cantidad</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Subtotal</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {selectedSale.items?.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.product?.name}</Table.Td>
                    <Table.Td>{item.quantity}</Table.Td>
                    <Table.Td>${item.price.toFixed(2)}</Table.Td>
                    <Table.Td>${item.subtotal.toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Card withBorder padding="md" bg="blue.0">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text>Subtotal:</Text>
                  <Text fw={500}>${selectedSale.subtotal.toFixed(2)}</Text>
                </Group>
                {selectedSale.discount > 0 && (
                  <Group justify="space-between">
                    <Text>Descuento:</Text>
                    <Text fw={500} c="red">
                      -${selectedSale.discount.toFixed(2)}
                    </Text>
                  </Group>
                )}
                {selectedSale.tax > 0 && (
                  <Group justify="space-between">
                    <Text>Impuesto:</Text>
                    <Text fw={500}>${selectedSale.tax.toFixed(2)}</Text>
                  </Group>
                )}
                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    TOTAL:
                  </Text>
                  <Text fw={700} size="lg" c="blue">
                    ${selectedSale.total.toFixed(2)}
                  </Text>
                </Group>
              </Stack>
            </Card>

            {selectedSale.notes && (
              <Card withBorder padding="md">
                <Text size="sm" c="dimmed">
                  Notas:
                </Text>
                <Text>{selectedSale.notes}</Text>
              </Card>
            )}
          </Stack>
        )}
      </Modal>
    </>
  )
}
