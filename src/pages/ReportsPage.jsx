"use client"

import { Stack, Group, Text, Card, Grid, Select, LoadingOverlay, Table, Badge, SimpleGrid } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { LineChart, BarChart, PieChart } from "@mantine/charts"
import { IconTrendingUp, IconTrendingDown, IconCash, IconShoppingCart } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { db } from "../config/db"
import { useSync } from "../context/SyncContext"

export default function ReportsPage() {
  const { isOnline } = useSync()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState([new Date(new Date().setDate(new Date().getDate() - 30)), new Date()])
  const [salesReport, setSalesReport] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [groupBy, setGroupBy] = useState("day")

  useEffect(() => {
    loadReports()
  }, [isOnline, dateRange, groupBy])

  const loadReports = async () => {
    try {
      setLoading(true)

      const params = {
        groupBy,
      }

      if (dateRange[0]) params.startDate = dateRange[0].toISOString()
      if (dateRange[1]) params.endDate = dateRange[1].toISOString()

      if (isOnline) {
        try {
          const [salesData, productsData] = await Promise.all([
            api.getSalesReport(params),
            api.getTopProducts({ limit: 10, ...params }),
          ])

          setSalesReport(salesData)
          setTopProducts(productsData)
        } catch (error) {
          console.warn("[ReportsPage] Error fetching reports, using local cache", error)
          await loadOfflineReports(params)
          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, mostrando reportes locales",
            color: "orange",
          })
        }
      } else {
        await loadOfflineReports(params)
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar reportes",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadOfflineReports = async (params) => {
    const sales = await db.sales.toArray()
    const saleItems = await db.saleItems.toArray()
    const products = await db.products.toArray()

    const startDate = params.startDate ? new Date(params.startDate) : null
    const endDate = params.endDate ? new Date(params.endDate) : null

    const filteredSales = sales.filter((sale) => {
      const createdAt = new Date(sale.createdAt)
      if (startDate && createdAt < startDate) return false
      if (endDate && createdAt > endDate) return false
      if (params.status && sale.status !== params.status) return false
      return true
    })

    const grouped = {}
    filteredSales.forEach((sale) => {
      const dateKey = new Date(sale.createdAt)
      const key = params.groupBy === "month"
        ? `${dateKey.getFullYear()}-${String(dateKey.getMonth() + 1).padStart(2, "0")}`
        : `${dateKey.getFullYear()}-${String(dateKey.getMonth() + 1).padStart(2, "0")}-${String(dateKey.getDate()).padStart(2, "0")}`

      if (!grouped[key]) {
        grouped[key] = { date: key, total: 0, count: 0, byPaymentMethod: {} }
      }
      grouped[key].total += sale.total || 0
      grouped[key].count += 1
      const method = sale.paymentMethod || "OTHER"
      grouped[key].byPaymentMethod[method] = (grouped[key].byPaymentMethod[method] || 0) + (sale.total || 0)
    })

    setSalesReport(Object.values(grouped))

    const productCounts = {}
    const saleIds = new Set(filteredSales.map((sale) => sale.localId || sale.id))
    saleItems.forEach((item) => {
      if (saleIds.has(item.saleLocalId)) {
        const key = item.productId
        if (!productCounts[key]) {
          productCounts[key] = { productId: item.productId, quantity: 0, revenue: 0 }
        }
        productCounts[key].quantity += item.quantity || 0
        productCounts[key].revenue += (item.price || 0) * (item.quantity || 0)
      }
    })

    const top = Object.values(productCounts)
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, 10)
      .map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.productId) || { name: "Producto local", code: "N/A" },
      }))

    setTopProducts(top)
  }

  const formatCurrency = (value) => Number(value || 0).toFixed(2)
  const formatPercent = (value) => Number(value || 0).toFixed(1)
  const formatProductName = (name) => {
    const safeName = typeof name === "string" && name.length > 0 ? name : "Producto local"
    return safeName.length > 15 ? `${safeName.substring(0, 15)}...` : safeName
  }

  // Calcular totales
  const totalSales = salesReport.reduce((sum, item) => sum + (item.total || 0), 0)
  const totalTransactions = salesReport.reduce((sum, item) => sum + (item.count || 0), 0)
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0

  // Calcular tendencia
  const firstHalf = salesReport.slice(0, Math.floor(salesReport.length / 2))
  const secondHalf = salesReport.slice(Math.floor(salesReport.length / 2))
  const firstHalfTotal = firstHalf.reduce((sum, item) => sum + item.total, 0)
  const secondHalfTotal = secondHalf.reduce((sum, item) => sum + item.total, 0)
  const trend = firstHalfTotal > 0 ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100 : 0

  // Preparar datos para gráficos
  const lineChartData = salesReport.map((item) => ({
    date: item.date,
    Ventas: item.total,
  }))

  const barChartData = topProducts.map((item) => ({
    producto: formatProductName(item.product?.name),
    Cantidad: item.quantity || 0,
    Ingresos: item.revenue || 0,
  }))

  // Datos para gráfico de pastel (métodos de pago)
  const paymentMethods = salesReport.reduce((acc, item) => {
    Object.entries(item.byPaymentMethod || {}).forEach(([method, amount]) => {
      if (!acc[method]) acc[method] = 0
      acc[method] += amount
    })
    return acc
  }, {})

  const pieChartData = Object.entries(paymentMethods).map(([name, value]) => ({
    name: name === "CASH" ? "Efectivo" : name === "CARD" ? "Tarjeta" : name === "TRANSFER" ? "Transferencia" : "Otro",
    value,
    color: name === "CASH" ? "green" : name === "CARD" ? "blue" : name === "TRANSFER" ? "violet" : "gray",
  }))

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="xl" fw={700}>
          Reportes y Analíticas
        </Text>
      </Group>

      {!isOnline && (
        <Card withBorder bg="orange.0" padding="md">
          <Text size="sm">Modo offline activo: mostrando datos locales si están disponibles</Text>
        </Card>
      )}

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <DatePickerInput
              type="range"
              label="Período"
              placeholder="Seleccionar rango de fechas"
              value={dateRange}
              onChange={setDateRange}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Select
              label="Agrupar por"
              value={groupBy}
              onChange={setGroupBy}
              data={[
                { value: "day", label: "Día" },
                { value: "month", label: "Mes" },
              ]}
            />
          </Grid.Col>
        </Grid>
      </Card>

      <LoadingOverlay visible={loading} />

      {!loading && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Ventas Totales
                </Text>
                <IconCash size={20} color="green" />
              </Group>
              <Text size="xl" fw={700}>
                ${formatCurrency(totalSales)}
              </Text>
              <Group gap="xs" mt="xs">
                {trend >= 0 ? <IconTrendingUp size={16} color="green" /> : <IconTrendingDown size={16} color="red" />}
                <Text size="sm" c={trend >= 0 ? "green" : "red"}>
                  {trend >= 0 ? "+" : ""}
                  {formatPercent(trend)}%
                </Text>
              </Group>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Transacciones
                </Text>
                <IconShoppingCart size={20} color="blue" />
              </Group>
              <Text size="xl" fw={700}>
                {totalTransactions}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                ventas completadas
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Ticket Promedio
                </Text>
                <IconCash size={20} color="violet" />
              </Group>
              <Text size="xl" fw={700}>
                ${formatCurrency(averageTicket)}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                por transacción
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Productos Vendidos
                </Text>
                <IconShoppingCart size={20} color="orange" />
              </Group>
              <Text size="xl" fw={700}>
                {topProducts.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                unidades totales
              </Text>
            </Card>
          </SimpleGrid>

          <Grid>
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text fw={700} mb="md">
                  Evolución de Ventas
                </Text>
                {lineChartData.length > 0 ? (
                  <LineChart
                    h={300}
                    data={lineChartData}
                    dataKey="date"
                    series={[{ name: "Ventas", color: "blue" }]}
                    curveType="linear"
                    withLegend
                    withTooltip
                  />
                ) : (
                  <Text ta="center" c="dimmed" py="xl">
                    No hay datos para mostrar
                  </Text>
                )}
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Text fw={700} mb="md">
                  Métodos de Pago
                </Text>
                {pieChartData.length > 0 ? (
                  <PieChart h={250} data={pieChartData} withLabels withTooltip />
                ) : (
                  <Text ta="center" c="dimmed" py="xl">
                    No hay datos
                  </Text>
                )}
              </Card>
            </Grid.Col>
          </Grid>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={700} mb="md">
              Productos Más Vendidos
            </Text>
            {barChartData.length > 0 ? (
              <BarChart
                h={300}
                data={barChartData}
                dataKey="producto"
                series={[
                  { name: "Cantidad", color: "blue" },
                  { name: "Ingresos", color: "green" },
                ]}
                withLegend
                withTooltip
              />
            ) : (
              <Text ta="center" c="dimmed" py="xl">
                No hay datos para mostrar
              </Text>
            )}
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={700} mb="md">
              Detalle de Productos Más Vendidos
            </Text>
            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Posición</Table.Th>
                    <Table.Th>Producto</Table.Th>
                    <Table.Th>Código</Table.Th>
                    <Table.Th>Cantidad Vendida</Table.Th>
                    <Table.Th>Ventas</Table.Th>
                    <Table.Th>Ingresos</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topProducts.map((item, index) => (
                    <Table.Tr key={item.product?.id || item.productId || index}>
                      <Table.Td>
                        <Badge
                          size="lg"
                          variant="filled"
                          color={index === 0 ? "yellow" : index === 1 ? "gray" : index === 2 ? "orange" : "blue"}
                        >
                          #{index + 1}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{item.product?.name ?? "Producto local"}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {item.product?.code ?? "N/A"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="blue">{item.quantity || 0} unidades</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="violet">{item.salesCount || 0} ventas</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={700} c="green">
                          ${formatCurrency(item.revenue)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            {topProducts.length === 0 && (
              <Text ta="center" c="dimmed" py="xl">
                No hay datos para mostrar
              </Text>
            )}
          </Card>
        </>
      )}
    </Stack>
  )
}
