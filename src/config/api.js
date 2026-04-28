const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

class ApiClient {
  constructor() {
    this.baseURL = API_URL
    this.token = localStorage.getItem("token")
  }

  setToken(token) {
    this.token = token
    if (token) {
      localStorage.setItem("token", token)
    } else {
      localStorage.removeItem("token")
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const config = {
      ...options,
      headers,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[API] Error:", error)
      throw error
    }
  }

  // Auth
  async login(credentials) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  }

  async getProfile() {
    return this.request("/auth/profile")
  }

  async changePassword(data) {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Users
  async getUsers() {
    return this.request("/users")
  }

  async createUser(data) {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: "DELETE",
    })
  }

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/products${query ? `?${query}` : ""}`)
  }

  async getProduct(id) {
    return this.request(`/products/${id}`)
  }

  async createProduct(data) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProduct(id, data) {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: "DELETE",
    })
  }

  async getLowStockProducts() {
    return this.request("/products/low-stock")
  }

  // Categories
  async getCategories() {
    return this.request("/categories")
  }

  async createCategory(data) {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: "DELETE",
    })
  }

  // Customers
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/customers${query ? `?${query}` : ""}`)
  }

  async getCustomer(id) {
    return this.request(`/customers/${id}`)
  }

  async createCustomer(data) {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateCustomer(id, data) {
    return this.request(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteCustomer(id) {
    return this.request(`/customers/${id}`, {
      method: "DELETE",
    })
  }

  // Sales
  async getSales(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/sales${query ? `?${query}` : ""}`)
  }

  async getSale(id) {
    return this.request(`/sales/${id}`)
  }

  async createSale(data) {
    return this.request("/sales", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async cancelSale(id) {
    return this.request(`/sales/${id}/cancel`, {
      method: "POST",
    })
  }

  // Sync
  async syncSales(sales) {
    return this.request("/sync/sales", {
      method: "POST",
      body: JSON.stringify({ sales }),
    })
  }

  async getLastSync() {
    return this.request("/sync/last-sync")
  }

  // Reports
  async getDashboardStats() {
    return this.request("/reports/dashboard")
  }

  async getSalesReport(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/reports/sales${query ? `?${query}` : ""}`)
  }

  async getTopProducts(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/reports/top-products${query ? `?${query}` : ""}`)
  }
}

export const api = new ApiClient()
export default api
