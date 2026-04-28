"use client"

import { Button, Card, Group, Text } from "@mantine/core"
import { IconDownload, IconX } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { promptInstall } from "../utils/registerSW"

export default function InstallPWA() {
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setShowInstall(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    // Verificar si ya está instalada
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstall(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const handleInstall = () => {
    promptInstall()
    setShowInstall(false)
  }

  if (!showInstall) return null

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder bg="blue.0">
      <Group justify="space-between">
        <div>
          <Text fw={500}>Instalar Aplicación</Text>
          <Text size="sm" c="dimmed">
            Instala PWA Commerce para acceso rápido y uso offline
          </Text>
        </div>
        <Group>
          <Button leftSection={<IconDownload size={16} />} onClick={handleInstall} size="sm">
            Instalar
          </Button>
          <Button variant="subtle" onClick={() => setShowInstall(false)} size="sm">
            <IconX size={16} />
          </Button>
        </Group>
      </Group>
    </Card>
  )
}
