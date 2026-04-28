import React from "react"
import ReactDOM from "react-dom/client"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./context/AuthContext"
import { SyncProvider } from "./context/SyncContext"
import { registerSW } from "./utils/registerSW"

import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/dates/styles.css"
import "@mantine/charts/styles.css"
import "./index.css"

// Registrar Service Worker
registerSW()

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider
      theme={{
        primaryColor: "blue",
        defaultRadius: "md",
        fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
      }}
    >
      <Notifications position="top-right" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <SyncProvider>
            <App />
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>,
)
