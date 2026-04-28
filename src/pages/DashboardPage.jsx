"use client"

import { Grid, Card, Text, Group, Stack, Button } from "@mantine/core"
import { IconCash, IconPackage, IconUsers, IconAlertTriangle, IconRefresh } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { api } from "../config/api"
import { useSync } from "../context/SyncContext"
import SyncStatus from "../components/SyncStatus"
import InstallPWA from "../components/InstallPWA"

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { syncData, isSyncing, isOnline } = useSync()

  useEffect(() => {
    if (isOnline) {
      loadStats()
    }
  }, [isOnline])

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error("[v0] Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    await syncData()
    if (isOnline) {
      await loadStats()
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="xl" fw={700}>
          Dashboard
        </Text>
        <Button leftSection={<IconRefresh size={16} />} onClick={handleSync} loading={isSyncing} disabled={!isOnline}>
          Sincronizar Todo
        </Button>
      </Group>

      <InstallPWA />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Ventas Hoy
                  </Text>
                  <IconCash size={24} color="green" />
                </Group>
                <Text size="xl" fw={700}>
                  ${stats?.todaySales?.total?.toFixed(2) || "0.00"}
                </Text>
                <Text size="xs" c="dimmed">
                  {stats?.todaySales?.count || 0} transacciones
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Productos
                  </Text>
                  <IconPackage size={24} color="blue" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats?.productsCount || 0}
                </Text>
                <Text size="xs" c="dimmed">
                  activos
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Clientes
                  </Text>
                  <IconUsers size={24} color="violet" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats?.customersCount || 0}
                </Text>
                <Text size="xs" c="dimmed">
                  registrados
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed">
                    Stock Bajo
                  </Text>
                  <IconAlertTriangle size={24} color="orange" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats?.lowStockCount || 0}
                </Text>
                <Text size="xs" c="dimmed">
                  productos
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <SyncStatus />
        </Grid.Col>
      </Grid>

      {!isOnline && (
        <Card shadow="sm" padding="lg" radius="md" withBorder bg="orange.0">
          <Group>
            <IconAlertTriangle color="orange" />
            <div>
              <Text fw={500}>Modo Offline Activo</Text>
              <Text size="sm" c="dimmed">
                Puedes seguir trabajando normalmente. Todas las ventas se sincronizarán automáticamente cuando se
                restaure la conexión a internet.
              </Text>
            </div>
          </Group>
        </Card>
      )}
    </Stack>
  )
}
