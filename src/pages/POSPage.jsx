"use client"

import {
  Grid,
  Card,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  NumberInput,
  Badge,
  ActionIcon,
  Select,
  Modal,
} from "@mantine/core"
import { IconPlus, IconTrash, IconSearch, IconShoppingCart, IconUser } from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { db } from "../config/db"
import { useAuth } from "../context/AuthContext"
import { useSync } from "../context/SyncContext"

export default function POSPage() {
  const { user } = useAuth()
  const { isOnline, saveSaleOffline, syncData } = useSync()
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [notes, setNotes] = useState("")
  const [processing, setProcessing] = useState(false)
  const [customerModalOpened, setCustomerModalOpened] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    loadData()
  }, [isOnline])

  const loadData = async () => {
    try {
      if (isOnline) {
        const [productsData, customersData] = await Promise.all([api.getProducts({ active: true }), api.getCustomers()])
        setProducts(productsData)
        setCustomers(customersData)

        // Guardar en IndexedDB
        await db.products.clear()
        await db.products.bulkAdd(productsData)
        await db.customers.clear()
        await db.customers.bulkAdd(customersData)
      } else {
        // Cargar desde IndexedDB
        const [productsData, customersData] = await Promise.all([db.products.toArray(), db.customers.toArray()])
        setProducts(productsData.filter((p) => p.active))
        setCustomers(customersData)
      }
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    }
  }

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.productId === product.id)

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        notifications.show({
          title: "Stock insuficiente",
          message: `Solo hay ${product.stock} unidades disponibles`,
          color: "orange",
        })
        return
      }

      setCart(cart.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      if (product.stock === 0) {
        notifications.show({
          title: "Sin stock",
          message: "Este producto no tiene stock disponible",
          color: "red",
        })
        return
      }

      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
        },
      ])
    }
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p.id === productId)
    if (quantity > product.stock) {
      notifications.show({
        title: "Stock insuficiente",
        message: `Solo hay ${product.stock} unidades disponibles`,
        color: "orange",
      })
      return
    }

    setCart(cart.map((item) => (item.productId === productId ? { ...item, quantity } : item)))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.productId !== productId))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const handleCreateCustomer = async (e) => {
    e.preventDefault()

    try {
      if (!isOnline) {
        const localId = `local-customer-${Date.now()}`
        const customer = {
          ...newCustomer,
          id: localId,
          local: true,
        }
        await db.customers.put(customer)
        await db.syncQueue.add({
          type: "customer",
          action: "create",
          data: customer,
          timestamp: Date.now(),
        })
        setCustomers([...customers, customer])
        setSelectedCustomer(customer.id)
        setCustomerModalOpened(false)
        setNewCustomer({ name: "", email: "", phone: "" })

        notifications.show({
          title: "Guardado offline",
          message: "Cliente creado localmente",
          color: "blue",
        })
        return
      }

      const customer = await api.createCustomer(newCustomer)
      setCustomers([...customers, customer])
      setSelectedCustomer(customer.id)
      setCustomerModalOpened(false)
      setNewCustomer({ name: "", email: "", phone: "" })

      notifications.show({
        title: "Éxito",
        message: "Cliente creado correctamente",
        color: "green",
      })
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        const localId = `local-customer-${Date.now()}`
        const customer = {
          ...newCustomer,
          id: localId,
          local: true,
        }
        await db.customers.put(customer)
        await db.syncQueue.add({
          type: "customer",
          action: "create",
          data: customer,
          timestamp: Date.now(),
        })
        setCustomers([...customers, customer])
        setSelectedCustomer(customer.id)
        setCustomerModalOpened(false)
        setNewCustomer({ name: "", email: "", phone: "" })

        notifications.show({
          title: "Guardado offline",
          message: "Cliente creado localmente",
          color: "blue",
        })
      } else {
        notifications.show({
          title: "Error",
          message: "Error al crear cliente",
          color: "red",
        })
      }
    }
  }

  const processSale = async () => {
    if (cart.length === 0) {
      notifications.show({
        title: "Carrito vacío",
        message: "Agrega productos al carrito",
        color: "orange",
      })
      return
    }

    setProcessing(true)

    const saleData = {
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      customerId: selectedCustomer || null,
      paymentMethod,
      notes,
      userId: user.id,
      discount: 0,
      tax: 0,
    }

    try {
      if (isOnline) {
        await api.createSale(saleData)
        notifications.show({
          title: "Venta completada",
          message: "Venta registrada correctamente",
          color: "green",
        })
      } else {
        await saveSaleOffline(saleData)
        notifications.show({
          title: "Venta guardada offline",
          message: "Se sincronizará cuando haya conexión",
          color: "blue",
        })
      }

      // Actualizar stock local
      for (const item of cart) {
        const product = products.find((p) => p.id === item.productId)
        if (product) {
          product.stock -= item.quantity
        }
      }
      setProducts([...products])

      // Limpiar carrito
      setCart([])
      setSelectedCustomer(null)
      setNotes("")
      setPaymentMethod("CASH")
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error.message || "Error al procesar venta",
        color: "red",
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Text size="xl" fw={700}>
            Punto de Venta
          </Text>
          {!isOnline && (
            <Badge color="orange" variant="filled">
              Modo Offline
            </Badge>
          )}
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack>
                <TextInput
                  placeholder="Buscar producto por nombre o código..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                  <Stack gap="xs">
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        shadow="xs"
                        padding="sm"
                        withBorder
                        style={{ cursor: "pointer" }}
                        onClick={() => addToCart(product)}
                      >
                        <Group justify="space-between">
                          <div>
                            <Text fw={500}>{product.name}</Text>
                            <Text size="sm" c="dimmed">
                              {product.code}
                            </Text>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Text fw={700} size="lg">
                              ${product.price.toFixed(2)}
                            </Text>
                            <Badge color={product.stock > 10 ? "green" : product.stock > 0 ? "orange" : "red"}>
                              Stock: {product.stock}
                            </Badge>
                          </div>
                        </Group>
                      </Card>
                    ))}

                    {filteredProducts.length === 0 && (
                      <Text ta="center" c="dimmed" py="xl">
                        No se encontraron productos
                      </Text>
                    )}
                  </Stack>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack>
                <Group justify="space-between">
                  <Text fw={700} size="lg">
                    Carrito
                  </Text>
                  <IconShoppingCart size={24} />
                </Group>

                <Select
                  label="Cliente (opcional)"
                  placeholder="Seleccionar cliente"
                  data={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  clearable
                  searchable
                  rightSection={
                    <ActionIcon onClick={() => setCustomerModalOpened(true)} variant="transparent">
                      <IconPlus size={16} />
                    </ActionIcon>
                  }
                />

                <div style={{ minHeight: "300px", maxHeight: "300px", overflowY: "auto" }}>
                  {cart.length === 0 ? (
                    <Text ta="center" c="dimmed" py="xl">
                      Carrito vacío
                    </Text>
                  ) : (
                    <Stack gap="xs">
                      {cart.map((item) => (
                        <Card key={item.productId} shadow="xs" padding="sm" withBorder>
                          <Group justify="space-between" align="flex-start">
                            <div style={{ flex: 1 }}>
                              <Text fw={500} size="sm">
                                {item.name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                ${item.price.toFixed(2)} c/u
                              </Text>
                            </div>

                            <Group gap="xs">
                              <NumberInput
                                w={80}
                                min={1}
                                max={item.stock}
                                value={item.quantity}
                                onChange={(value) => updateQuantity(item.productId, value)}
                              />
                              <ActionIcon color="red" variant="light" onClick={() => removeFromCart(item.productId)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Group>
                          <Text fw={700} ta="right" mt="xs">
                            ${(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </div>

                <Select
                  label="Método de pago"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  data={[
                    { value: "CASH", label: "Efectivo" },
                    { value: "CARD", label: "Tarjeta" },
                    { value: "TRANSFER", label: "Transferencia" },
                    { value: "OTHER", label: "Otro" },
                  ]}
                />

                <TextInput label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                <Card padding="md" bg="blue.0">
                  <Group justify="space-between">
                    <Text fw={700} size="xl">
                      TOTAL:
                    </Text>
                    <Text fw={700} size="xl" c="blue">
                      ${calculateTotal().toFixed(2)}
                    </Text>
                  </Group>
                </Card>

                <Button
                  fullWidth
                  size="lg"
                  onClick={processSale}
                  loading={processing}
                  disabled={cart.length === 0}
                  leftSection={<IconShoppingCart size={20} />}
                >
                  Completar Venta
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>

      <Modal opened={customerModalOpened} onClose={() => setCustomerModalOpened(false)} title="Nuevo Cliente" centered>
        <form onSubmit={handleCreateCustomer}>
          <Stack>
            <TextInput
              label="Nombre"
              required
              leftSection={<IconUser size={16} />}
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            />

            <TextInput
              label="Email (opcional)"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />

            <TextInput
              label="Teléfono (opcional)"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setCustomerModalOpened(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Cliente</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
