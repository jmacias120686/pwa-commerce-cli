# Frontend PWA Commerce

Aplicación PWA para sistema de punto de venta con soporte offline.

## Tecnologías

- React 18
- Vite
- Mantine UI v7
- React Router v6
- Dexie (IndexedDB)
- Workbox (Service Worker)

## Instalación

1. Instalar dependencias:
```bash
cd frontend
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

3. Iniciar desarrollo:
```bash
npm run dev
```

4. Build producción:
```bash
npm run build
```

## Características PWA

- Service Worker para cache offline
- IndexedDB para almacenamiento local
- Sincronización automática
- Instalable como app nativa
- Funciona sin conexión

## Estructura

```
src/
├── components/     # Componentes reutilizables
├── pages/         # Páginas de la aplicación
├── context/       # Context API (Auth, Sync)
├── config/        # Configuración (API, DB)
├── utils/         # Utilidades
└── main.jsx       # Punto de entrada
```

## Credenciales Demo

- **Admin**: admin@tienda.com / 123456
- **Cajero**: cajero@tienda.com / 123456
