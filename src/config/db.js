import Dexie from "dexie"

// IndexedDB para almacenamiento local offline
export const db = new Dexie("PWACommerceDB")

db.version(1).stores({
  products: "id, code, name, categoryId, active",
  categories: "id, name",
  customers: "id, name, email, phone",
  sales: "++localId, id, userId, status, createdAt, synced",
  saleItems: "++id, saleLocalId, productId",
  syncQueue: "++id, type, action, timestamp",
})

// Inicializar la base de datos
export async function initDB() {
  try {
    await db.open()
    console.log("[DB] IndexedDB inicializado")
    return true
  } catch (error) {
    console.error("[DB] Error al inicializar:", error)
    return false
  }
}

// Limpiar datos locales
export async function clearLocalData() {
  try {
    await db.products.clear()
    await db.categories.clear()
    await db.customers.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.syncQueue.clear()
    console.log("[DB] Datos locales limpiados")
  } catch (error) {
    console.error("[DB] Error al limpiar datos:", error)
  }
}

export default db
