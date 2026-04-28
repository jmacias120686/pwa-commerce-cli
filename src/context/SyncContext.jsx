"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { api } from "../config/api"
import { db } from "../config/db"
import { notifications } from "@mantine/notifications"
import { useAuth } from "./AuthContext"

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingSales, setPendingSales] = useState(0)
  const [lastSync, setLastSync] = useState(null)
  const [autoSyncInterval, setAutoSyncInterval] = useState(null)

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Sync] Conexión restaurada")
      setIsOnline(true)
      notifications.show({
        title: "Conexión restaurada",
        message: "Sincronizando datos automáticamente...",
        color: "green",
        autoClose: 3000,
      })
      syncData()
    }

    const handleOffline = () => {
      console.log("[Sync] Sin conexión - Modo offline activado")
      setIsOnline(false)
      notifications.show({
        title: "Sin conexión",
        message: "Trabajando en modo offline. Los datos se sincronizarán automáticamente.",
        color: "orange",
        autoClose: 5000,
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-sync cada 5 minutos si hay datos pendientes
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      checkPendingSales()

      const interval = setInterval(
        () => {
          if (isOnline && !isSyncing) {
            checkPendingSales().then((count) => {
              if (count > 0) {
                console.log(`[Sync] Auto-sync: ${count} ventas pendientes`)
                syncData()
              }
            })
          }
        },
        5 * 60 * 1000,
      ) // 5 minutos

      setAutoSyncInterval(interval)

      return () => clearInterval(interval)
    }
  }, [isAuthenticated, isOnline])

  const checkPendingSales = async () => {
    try {
      const sales = await db.sales.where("synced").equals(0).toArray()
      const count = sales.length
      setPendingSales(count)
      return count
    } catch (error) {
      console.error("[Sync] Error checking pending sales:", error)
      return 0
    }
  }

  const syncData = useCallback(async () => {
    if (!isOnline || !isAuthenticated || isSyncing) {
      console.log("[Sync] Skipping sync - conditions not met")
      return
    }

    try {
      setIsSyncing(true)
      console.log("[Sync] Starting synchronization...")

      // 1. Sincronizar ventas pendientes
      await syncPendingSales()

      // 2. Sincronizar acciones en cola (productos y categorías)
      await syncQueuedActions()

      // 3. Actualizar catálogos locales
      await syncProducts()
      await syncCategories()
      await syncCustomers()

      setLastSync(new Date())
      console.log("[Sync] Synchronization completed successfully")
    } catch (error) {
      console.error("[Sync] Synchronization error:", error)
      notifications.show({
        title: "Error de sincronización",
        message: error.message || "No se pudieron sincronizar todos los datos",
        color: "red",
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isOnline, isAuthenticated, isSyncing])

  const syncPendingSales = async () => {
    try {
      const pendingSalesData = await db.sales.where("synced").equals(0).toArray()

      if (pendingSalesData.length === 0) {
        console.log("[Sync] No pending sales to sync")
        return
      }

      console.log(`[Sync] Syncing ${pendingSalesData.length} pending sales...`)

      // Obtener items de cada venta
      const salesWithItems = await Promise.all(
        pendingSalesData.map(async (sale) => {
          const items = await db.saleItems.where("saleLocalId").equals(sale.localId).toArray()
          return {
            ...sale,
            items: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          }
        }),
      )

      const result = await api.syncSales(salesWithItems)

      // Marcar ventas como sincronizadas
      for (const res of result.results) {
        if (res.status === "synced" || res.status === "already_synced") {
          await db.sales.where("localId").equals(res.localId).modify({
            synced: 1,
            id: res.id,
          })
        }
      }

      if (result.synced > 0) {
        notifications.show({
          title: "Sincronización completada",
          message: `${result.synced} ${result.synced === 1 ? "venta sincronizada" : "ventas sincronizadas"}`,
          color: "green",
        })
      }

      if (result.errors > 0) {
        notifications.show({
          title: "Errores en sincronización",
          message: `${result.errors} ${result.errors === 1 ? "venta falló" : "ventas fallaron"}`,
          color: "orange",
        })
      }

      await checkPendingSales()
    } catch (error) {
      console.error("[Sync] Error syncing sales:", error)
      throw error
    }
  }

  const syncQueuedActions = async () => {
    try {
      const queuedActions = await db.syncQueue.toArray()
      const localToServerIds = {
        product: {},
        category: {},
        customer: {},
      }

      for (const action of queuedActions.sort((a, b) => a.timestamp - b.timestamp)) {
        try {
          let result
          let actionId = action.data.id

          if (localToServerIds[action.type]?.[actionId]) {
            actionId = localToServerIds[action.type][actionId]
          }

          if (action.type === "product") {
            if (action.action === "create") {
              const payload = { ...action.data }
              if (payload.id?.startsWith("local-product-")) {
                delete payload.id
                delete payload.local
              }
              result = await api.createProduct(payload)
              if (action.data.id.startsWith("local-product-")) {
                localToServerIds.product[action.data.id] = result.id
                await db.products.delete(action.data.id)
              }
              await db.products.put(result)
            } else if (action.action === "update") {
              result = await api.updateProduct(actionId, action.data)
              await db.products.put(result)
            } else if (action.action === "delete") {
              await api.deleteProduct(actionId)
              await db.products.delete(action.data.id)
            }
          } else if (action.type === "category") {
            if (action.action === "create") {
              const payload = { ...action.data }
              if (payload.id?.startsWith("local-category-")) {
                delete payload.id
                delete payload.local
              }
              result = await api.createCategory(payload)
              if (action.data.id.startsWith("local-category-")) {
                localToServerIds.category[action.data.id] = result.id
                await db.categories.delete(action.data.id)
              }
              await db.categories.put(result)
            } else if (action.action === "update") {
              result = await api.updateCategory(actionId, action.data)
              await db.categories.put(result)
            } else if (action.action === "delete") {
              await api.deleteCategory(actionId)
              await db.categories.delete(action.data.id)
            }
          } else if (action.type === "customer") {
            if (action.action === "create") {
              const payload = { ...action.data }
              if (payload.id?.startsWith("local-customer-")) {
                delete payload.id
                delete payload.local
              }
              result = await api.createCustomer(payload)
              if (action.data.id.startsWith("local-customer-")) {
                localToServerIds.customer[action.data.id] = result.id
                await db.customers.delete(action.data.id)
              }
              await db.customers.put(result)
            } else if (action.action === "update") {
              result = await api.updateCustomer(actionId, action.data)
              await db.customers.put(result)
            } else if (action.action === "delete") {
              await api.deleteCustomer(actionId)
              await db.customers.delete(action.data.id)
            }
          }

          await db.syncQueue.delete(action.id)
        } catch (error) {
          console.error("[Sync] Error syncing queued action:", action, error)
        }
      }
    } catch (error) {
      console.error("[Sync] Error reading queued actions:", error)
    }
  }

  const syncProducts = async () => {
    try {
      const products = await api.getProducts({ active: true })
      await db.products.clear()
      await db.products.bulkPut(products)
      console.log(`[Sync] ${products.length} products synchronized`)
    } catch (error) {
      console.error("[Sync] Error syncing products:", error)
    }
  }

  const syncCategories = async () => {
    try {
      const categories = await api.getCategories()
      await db.categories.clear()
      await db.categories.bulkPut(categories)
      console.log(`[Sync] ${categories.length} categories synchronized`)
    } catch (error) {
      console.error("[Sync] Error syncing categories:", error)
    }
  }

  const syncCustomers = async () => {
    try {
      const customers = await api.getCustomers()
      await db.customers.clear()
      await db.customers.bulkPut(customers)
      console.log(`[Sync] ${customers.length} customers synchronized`)
    } catch (error) {
      console.error("[Sync] Error syncing customers:", error)
    }
  }

  const saveSaleOffline = async (saleData) => {
    try {
      const localId = `offline-${Date.now()}`

      console.log(`[Sync] Saving sale offline with localId: ${localId}`)

      await db.sales.add({
        localId,
        id: localId,
        ...saleData,
        status: saleData.status || "COMPLETED",
        synced: 0,
        createdAt: new Date().toISOString(),
      })

      for (const item of saleData.items) {
        await db.saleItems.add({
          saleLocalId: localId,
          ...item,
        })
      }

      // Actualizar stock local
      for (const item of saleData.items) {
        const product = await db.products.get(item.productId)
        if (product) {
          await db.products.update(item.productId, {
            stock: product.stock - item.quantity,
          })
        }
      }

      await checkPendingSales()

      console.log("[Sync] Sale saved offline successfully")
      return { success: true, localId }
    } catch (error) {
      console.error("[Sync] Error saving offline sale:", error)
      return { success: false, error: error.message }
    }
  }

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingSales,
        lastSync,
        syncData,
        saveSaleOffline,
        syncProducts,
        syncCategories,
        syncCustomers,
        checkPendingSales,
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error("useSync debe usarse dentro de SyncProvider")
  }
  return context
}
