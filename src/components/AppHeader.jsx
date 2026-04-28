"use client"

import { Group, Burger, Text, Badge, Button, Menu, Avatar, rem } from "@mantine/core"
import { IconChevronDown, IconLogout, IconKey } from "@tabler/icons-react"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useSync } from "../context/SyncContext"
import PasswordChangeModal from "./PasswordChangeModal"

export default function AppHeader({ mobileOpened, desktopOpened, toggleMobile, toggleDesktop }) {
  const { user, logout } = useAuth()
  const { isOnline, pendingSales } = useSync()
  const [passwordModalOpened, setPasswordModalOpened] = useState(false)

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
        <Group>
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />
          <Text size="xl" fw={700} c="blue">
            PWA Commerce
          </Text>
        </Group>

        <Group>
          {!isOnline && (
            <Badge color="orange" variant="filled">
              Offline
            </Badge>
          )}

          {pendingSales > 0 && (
            <Badge color="red" variant="filled">
              {pendingSales} sin sincronizar
            </Badge>
          )}

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="subtle" rightSection={<IconChevronDown size={16} />}>
                <Group gap="xs">
                  <Avatar size="sm" radius="xl" color="blue">
                    {user?.name?.charAt(0) || "U"}
                  </Avatar>
                  <Text size="sm" fw={500}>
                    {user?.name}
                  </Text>
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>
                {user?.email}
                <br />
                <Badge size="xs" variant="light">
                  {user?.role}
                </Badge>
              </Menu.Label>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconKey style={{ width: rem(14), height: rem(14) }} />}
                onClick={() => setPasswordModalOpened(true)}
              >
                Cambiar contraseña
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                onClick={logout}
              >
                Cerrar sesión
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <PasswordChangeModal opened={passwordModalOpened} onClose={() => setPasswordModalOpened(false)} />
    </>
  )
}
