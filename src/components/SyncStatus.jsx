"use client"

import { Card, Group, Text, Button, Progress, Stack, Timeline } from "@mantine/core"
import { IconCloudUpload, IconCloudCheck, IconAlertCircle, IconRefresh } from "@tabler/icons-react"
import { useSync } from "../context/SyncContext"

export default function SyncStatus() {
  const { isOnline, isSyncing, pendingSales, lastSync, syncData } = useSync()

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack>
        <Group justify="space-between">
          <Group>
            {isOnline ? <IconCloudCheck size={24} color="green" /> : <IconAlertCircle size={24} color="orange" />}
            <div>
              <Text fw={700}>{isOnline ? "En Línea" : "Sin Conexión"}</Text>
              <Text size="sm" c="dimmed">
                {isOnline ? "Sistema conectado" : "Modo offline activo"}
              </Text>
            </div>
          </Group>

          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={syncData}
            loading={isSyncing}
            disabled={!isOnline || pendingSales === 0}
          >
            Sincronizar
          </Button>
        </Group>

        {pendingSales > 0 && (
          <Card withBorder bg="orange.0" padding="md">
            <Group>
              <IconCloudUpload size={20} />
              <div>
                <Text fw={500}>Ventas pendientes de sincronización</Text>
                <Text size="sm" c="dimmed">
                  {pendingSales} {pendingSales === 1 ? "venta" : "ventas"} esperando conexión
                </Text>
              </div>
            </Group>
          </Card>
        )}

        {isSyncing && (
          <div>
            <Text size="sm" mb="xs">
              Sincronizando datos...
            </Text>
            <Progress value={100} animated />
          </div>
        )}

        {lastSync && (
          <Text size="xs" c="dimmed">
            Última sincronización: {new Date(lastSync).toLocaleString()}
          </Text>
        )}

        <Timeline active={2}>
          <Timeline.Item title="Conexión establecida">
            <Text c="dimmed" size="xs">
              Sistema {isOnline ? "conectado" : "desconectado"}
            </Text>
          </Timeline.Item>

          <Timeline.Item title="Datos locales">
            <Text c="dimmed" size="xs">
              Productos, categorías y clientes en caché
            </Text>
          </Timeline.Item>

          <Timeline.Item title="Sincronización automática">
            <Text c="dimmed" size="xs">
              {pendingSales > 0 ? `${pendingSales} ventas pendientes` : "Todas las ventas sincronizadas"}
            </Text>
          </Timeline.Item>
        </Timeline>
      </Stack>
    </Card>
  )
}
