"use client"

import {
  Stack,
  Group,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Card,
  LoadingOverlay,
  Tabs,
  Grid,
  Alert,
} from "@mantine/core"
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconAlertCircle,
  IconPackage,
  IconCategory,
} from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { notifications } from "@mantine/notifications"
import { api } from "../config/api"
import { useAuth } from "../context/AuthContext"
import { useSync } from "../context/SyncContext"
import { db } from "../config/db"
import CategoryManager from "../components/CategoryManager"

export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const { isOnline, syncProducts } = useSync()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    price: 0,
    stock: 0,
    minStock: 5,
    categoryId: "",
    imageUrl: "",
    active: true,
  })

  useEffect(() => {
    loadData()
  }, [isOnline])

  const loadData = async () => {
    try {
      setLoading(true)

      if (isOnline) {
        try {
          const [productsData, categoriesData] = await Promise.all([api.getProducts(), api.getCategories()])
          setProducts(productsData)
          setCategories(categoriesData)

          // Guardar en IndexedDB
          await db.products.clear()
          await db.products.bulkPut(productsData)
          await db.categories.clear()
          await db.categories.bulkPut(categoriesData)
        } catch (error) {
          console.warn("[ProductsPage] Error fetching server data, using local cache:", error)
          const [productsData, categoriesData] = await Promise.all([db.products.toArray(), db.categories.toArray()])
          setProducts(productsData)
          setCategories(categoriesData)
          notifications.show({
            title: "Modo offline",
            message: "No se pudo conectar al servidor, cargando datos locales",
            color: "orange",
          })
        }
      } else {
        const [productsData, categoriesData] = await Promise.all([db.products.toArray(), db.categories.toArray()])
        setProducts(productsData)
        setCategories(categoriesData)
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Error al cargar productos",
        color: "red",
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData({
      code: "",
      name: "",
      description: "",
      price: 0,
      stock: 0,
      minStock: 5,
      categoryId: "",
      imageUrl: "",
      active: true,
    })
    setModalOpened(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      code: product.code,
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      minStock: product.minStock,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl || "",
      active: product.active,
    })
    setModalOpened(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (!isOnline) {
        const localId = editingProduct?.id || `local-product-${Date.now()}`
        const productData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-product-"),
        }

        await db.products.put(productData)
        await db.syncQueue.add({
          type: "product",
          action: editingProduct ? "update" : "create",
          data: productData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingProduct ? "Producto actualizado localmente" : "Producto creado localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadData()
        return
      }

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData)
        notifications.show({
          title: "Éxito",
          message: "Producto actualizado correctamente",
          color: "green",
        })
      } else {
        await api.createProduct(formData)
        notifications.show({
          title: "Éxito",
          message: "Producto creado correctamente",
          color: "green",
        })
      }

      setModalOpened(false)
      await loadData()
      await syncProducts()
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        const localId = editingProduct?.id || `local-product-${Date.now()}`
        const productData = {
          ...formData,
          id: localId,
          local: localId.startsWith("local-product-"),
        }

        await db.products.put(productData)
        await db.syncQueue.add({
          type: "product",
          action: editingProduct ? "update" : "create",
          data: productData,
          timestamp: Date.now(),
        })

        notifications.show({
          title: "Guardado offline",
          message: editingProduct ? "Producto actualizado localmente" : "Producto creado localmente",
          color: "blue",
        })

        setModalOpened(false)
        await loadData()
      } else {
        notifications.show({
          title: "Error",
          message: error.message || "Error al guardar producto",
          color: "red",
        })
      }
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm("¿Estás seguro de desactivar este producto?")) return

    try {
      if (!isOnline) {
        await db.products.delete(productId)
        await db.syncQueue.add({
          type: "product",
          action: "delete",
          data: { id: productId },
          timestamp: Date.now(),
        })
        notifications.show({
          title: "Guardado offline",
          message: "Producto eliminado localmente. Se sincronizará cuando haya conexión.",
          color: "blue",
        })
        await loadData()
        return
      }

      await api.deleteProduct(productId)
      notifications.show({
        title: "Éxito",
        message: "Producto desactivado correctamente",
        color: "green",
      })
      await loadData()
      await syncProducts()
    } catch (error) {
      if (error.message === "Failed to fetch" || error.message.includes("NetworkError")) {
        await db.products.delete(productId)
        await db.syncQueue.add({
          type: "product",
          action: "delete",
          data: { id: productId },
          timestamp: Date.now(),
        })
        notifications.show({
          title: "Guardado offline",
          message: "Producto eliminado localmente. Se sincronizará cuando haya conexión.",
          color: "blue",
        })
        await loadData()
      } else {
        notifications.show({
          title: "Error",
          message: "Error al desactivar producto",
          color: "red",
        })
      }
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter

    return matchesSearch && matchesCategory
  })

  const lowStockProducts = products.filter((p) => p.active && p.stock <= p.minStock)

  return (
    <>
      <Tabs defaultValue="products">
        <Tabs.List>
          <Tabs.Tab value="products" leftSection={<IconPackage size={16} />}>
            Productos
          </Tabs.Tab>
          <Tabs.Tab value="categories" leftSection={<IconCategory size={16} />}>
            Categorías
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="products" pt="md">
          <Stack>
            <Group justify="space-between">
              <Text size="xl" fw={700}>
                Gestión de Productos
              </Text>
              {isAdmin() && (
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                  Nuevo Producto
                </Button>
              )}
            </Group>

            {lowStockProducts.length > 0 && (
              <Alert icon={<IconAlertCircle size={16} />} title="Alerta de Stock Bajo" color="orange">
                Hay {lowStockProducts.length} productos con stock bajo o agotado
              </Alert>
            )}

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack>
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      placeholder="Buscar por nombre o código..."
                      leftSection={<IconSearch size={16} />}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      placeholder="Filtrar por categoría"
                      data={[
                        { value: "", label: "Todas las categorías" },
                        ...categories.map((cat) => ({
                          value: cat.id,
                          label: cat.name,
                        })),
                      ]}
                      value={categoryFilter}
                      onChange={(value) => setCategoryFilter(value)}
                      clearable
                    />
                  </Grid.Col>
                </Grid>

                <LoadingOverlay visible={loading} />

                <div style={{ overflowX: "auto" }}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Categoría</Table.Th>
                        <Table.Th>Precio</Table.Th>
                        <Table.Th>Stock</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        {isAdmin() && <Table.Th>Acciones</Table.Th>}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => (
                        <Table.Tr key={product.id}>
                          <Table.Td>
                            <Text fw={500}>{product.code}</Text>
                          </Table.Td>
                          <Table.Td>{product.name}</Table.Td>
                          <Table.Td>
                            <Badge variant="light">{categories.find((c) => c.id === product.categoryId)?.name}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={500}>${product.price.toFixed(2)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={product.stock <= product.minStock ? "red" : "green"}>{product.stock}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={product.active ? "green" : "gray"}>
                              {product.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </Table.Td>
                          {isAdmin() && (
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  onClick={() => openEditModal(product)}
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  onClick={() => handleDelete(product.id)}
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
                </div>

                {filteredProducts.length === 0 && !loading && (
                  <Text ta="center" c="dimmed" py="xl">
                    No se encontraron productos
                  </Text>
                )}
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="categories" pt="md">
          <CategoryManager />
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        size="lg"
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Código"
                  required
                  disabled={!!editingProduct}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Categoría"
                  required
                  value={formData.categoryId}
                  onChange={(value) => setFormData({ ...formData, categoryId: value })}
                  data={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                />
              </Grid.Col>
            </Grid>

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

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Precio"
                  required
                  min={0}
                  decimalScale={2}
                  prefix="$"
                  value={formData.price}
                  onChange={(value) => setFormData({ ...formData, price: value })}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Stock"
                  required
                  min={0}
                  value={formData.stock}
                  onChange={(value) => setFormData({ ...formData, stock: value })}
                />
              </Grid.Col>
            </Grid>

            <NumberInput
              label="Stock Mínimo"
              required
              min={0}
              value={formData.minStock}
              onChange={(value) => setFormData({ ...formData, minStock: value })}
              description="Se alertará cuando el stock esté por debajo de este valor"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setModalOpened(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingProduct ? "Actualizar" : "Crear"}</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
