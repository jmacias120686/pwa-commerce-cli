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

  const normalizeSalesForIndexedDB = (data) => {
    return data.map((sale) => {
      const cleanSale = { ...sale }

      /*
        IMPORTANTE:
        Dexie usa "++localId" como clave primaria autoincremental.
        Si el backend envía localId como null, undefined, objeto o string vacío,
        IndexedDB falla con:
        "key path yielded a value that is not a valid key".
      */
      delete cleanSale.localId

      return {
        ...cleanSale,
        synced: true,
      }
    })
  }

  const loadSales = async () => {
    try {
      setLoading(true)

      const params = {}

      if (dateRange[0]) {
        params.startDate = dateRange[0].toISOString()
      }

      if (dateRange[1]) {
        params.endDate = dateRange[1].toISOString()
      }

      if (statusFilter) {
        params.status = statusFilter
      }

      if (isOnline) {
        try {
          const data = await api.getSales(params)

          const normalizedSales = normalizeSalesForIndexedDB(data)

          setSales(normalizedSales)

          await db.sales.clear()
          await db.sales.bulkPut(normalizedSales)
        } catch (error) {
          console.warn("[SalesPage] Error fetching sales, using local cache", error)

          const localData = await db.sales.toArray()
          setSales(localData)

          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, mostrando ventas locales",
            color: "orange",
          })
        }
      } else {
        const localData = await db.sales.toArray()
        setSales(localData)
      }
    } catch (error) {
      console.error("[SalesPage] Error general al cargar ventas:", error)

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
        let localSale = null

        if (sale.id) {
          localSale = await db.sales.where("id").equals(sale.id).first()
        }

        if (!localSale && sale.localId) {
          localSale = await db.sales.get(sale.localId)
        }

        if (localSale) {
          const items = await db.saleItems
            .where("saleLocalId")
            .equals(localSale.localId)
            .toArray()

          setSelectedSale({
            ...localSale,
            items,
          })

          setDetailModalOpened(true)
          return
        }
      }

      if (!sale.id) {
        notifications.show({
          title: "Venta local",
          message: "Esta venta todavía no está sincronizada con el servidor",
          color: "orange",
        })
        return
      }

      const data = await api.getSale(sale.id)
      setSelectedSale(data)
      setDetailModalOpened(true)
    } catch (error) {
      console.error("[SalesPage] Error al cargar detalle:", error)

      notifications.show({
        title: "Error",
        message: "Error al cargar detalles de la venta",
        color: "red",
      })
    }
  }

  const handleCancelSale = async (saleId) => {
    if (!saleId) {
      notifications.show({
        title: "Error",
        message: "No se puede cancelar una venta local no sincronizada",
        color: "red",
      })
      return
    }

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
      console.error("[SalesPage] Error al cancelar venta:", error)

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

    return labels[method] || method || "No definido"
  }

  const formatMoney = (value) => {
    const number = Number(value || 0)
    return `$${number.toFixed(2)}`
  }

  const formatDate = (value) => {
    if (!value) return "Sin fecha"

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return "Fecha inválida"
    }

    return date.toLocaleString()
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Historial de Ventas
          </Text>

          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadSales}
            disabled={!isOnline}
          >
            Actualizar
          </Button>
        </Group>

        {!isOnline && (
          <Card withBorder bg="orange.0" padding="md">
            <Text size="sm">
              Necesitas conexión para ver el historial actualizado de ventas.
              Se mostrarán las ventas guardadas localmente.
            </Text>
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
                    { value: "COMPLETED", label: "Completada" },
                    { value: "PENDING", label: "Pendiente" },
                    { value: "CANCELLED", label: "Cancelada" },
                  ]}
                  value={statusFilter || null}
                  onChange={(value) => setStatusFilter(value || "")}
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
                    <Table.Tr key={sale.id || sale.localId}>
                      <Table.Td>
                        <Text fw={500}>
                          {sale.saleNumber || `Local-${sale.localId}`}
                        </Text>
                      </Table.Td>

                      <Table.Td>{formatDate(sale.createdAt)}</Table.Td>

                      <Table.Td>{sale.customer?.name || "Sin cliente"}</Table.Td>

                      <Table.Td>{sale.user?.name || "Sin usuario"}</Table.Td>

                      <Table.Td>
                        <Text fw={700}>{formatMoney(sale.total)}</Text>
                      </Table.Td>

                      <Table.Td>
                        <Badge variant="light">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Badge color={getStatusColor(sale.status)}>
                          {sale.status || "SIN ESTADO"}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openDetailModal(sale)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>

                          {isAdmin() && sale.status === "COMPLETED" && (
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleCancelSale(sale.id)}
                              disabled={!isOnline || !sale.id}
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
                  <Text fw={700}>
                    {selectedSale.saleNumber || `Local-${selectedSale.localId}`}
                  </Text>
                </Grid.Col>

                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Estado
                  </Text>
                  <Badge color={getStatusColor(selectedSale.status)}>
                    {selectedSale.status || "SIN ESTADO"}
                  </Badge>
                </Grid.Col>

                <Grid.Col span={6}>
                  <Text size="sm" c="dimmed">
                    Fecha
                  </Text>
                  <Text>{formatDate(selectedSale.createdAt)}</Text>
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
                  <Text>{selectedSale.user?.name || "Sin usuario"}</Text>
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
                  <Table.Tr key={item.id || item.localId || item.productId}>
                    <Table.Td>{item.product?.name || "Producto"}</Table.Td>
                    <Table.Td>{item.quantity || 0}</Table.Td>
                    <Table.Td>{formatMoney(item.price)}</Table.Td>
                    <Table.Td>{formatMoney(item.subtotal)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Card withBorder padding="md" bg="blue.0">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text>Subtotal:</Text>
                  <Text fw={500}>{formatMoney(selectedSale.subtotal)}</Text>
                </Group>

                {Number(selectedSale.discount || 0) > 0 && (
                  <Group justify="space-between">
                    <Text>Descuento:</Text>
                    <Text fw={500} c="red">
                      -{formatMoney(selectedSale.discount)}
                    </Text>
                  </Group>
                )}

                {Number(selectedSale.tax || 0) > 0 && (
                  <Group justify="space-between">
                    <Text>Impuesto:</Text>
                    <Text fw={500}>{formatMoney(selectedSale.tax)}</Text>
                  </Group>
                )}

                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    TOTAL:
                  </Text>
                  <Text fw={700} size="lg" c="blue">
                    {formatMoney(selectedSale.total)}
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