import { Workbox } from "workbox-window"

export function registerSW() {
  if ("serviceWorker" in navigator) {
    const wb = new Workbox("/sw.js")

    // Registro de eventos del service worker
    wb.addEventListener("installed", (event) => {
      if (event.isUpdate) {
        console.log("[PWA] Nueva versión del Service Worker instalada")

        // Mostrar notificación de actualización
        if (
          confirm(
            "Hay una nueva versión de la aplicación disponible. ¿Desea actualizar ahora? Los cambios se aplicarán después de recargar.",
          )
        ) {
          wb.messageSkipWaiting()
          window.location.reload()
        }
      } else {
        console.log("[PWA] Service Worker instalado por primera vez")
      }
    })

    wb.addEventListener("activated", (event) => {
      console.log("[PWA] Service Worker activado")
      if (!event.isUpdate) {
        console.log("[PWA] La aplicación está lista para trabajar offline")
      }
    })

    wb.addEventListener("waiting", () => {
      console.log("[PWA] Nueva versión en espera para ser activada")
    })

    wb.addEventListener("controlling", () => {
      console.log("[PWA] Service Worker está controlando la página")
    })

    // Escuchar mensajes del service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "CACHE_UPDATED") {
        console.log("[PWA] Caché actualizada:", event.data.url)
      }
    })

    // Registrar el service worker
    wb.register()
      .then((registration) => {
        console.log("[PWA] Service Worker registrado exitosamente:", registration)

        // Verificar actualizaciones cada hora
        setInterval(
          () => {
            registration.update()
          },
          60 * 60 * 1000,
        ) // 1 hora
      })
      .catch((error) => {
        console.error("[PWA] Error al registrar Service Worker:", error)
      })

    // Detectar si la app está instalada
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      console.log("[PWA] La aplicación puede ser instalada")
      window.deferredPrompt = e
    })

    window.addEventListener("appinstalled", () => {
      console.log("[PWA] Aplicación instalada exitosamente")
      window.deferredPrompt = null
    })
  } else {
    console.warn("[PWA] Service Workers no están soportados en este navegador")
  }
}

// Función para solicitar instalación de la PWA
export function promptInstall() {
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt()
    window.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] Usuario aceptó la instalación")
      } else {
        console.log("[PWA] Usuario rechazó la instalación")
      }
      window.deferredPrompt = null
    })
  }
}
