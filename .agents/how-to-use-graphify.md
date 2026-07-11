# Guía de Uso de Graphify (Tindivo Delivery)

Esta guía explica cómo utilizar Graphify en este proyecto para explorar la arquitectura, consultar relaciones entre componentes y entender las distintas funcionalidades del sistema.

---

## 🛠️ Configuración y Generación del Grafo

### 1. Variables de Entorno y API Key
Para la extracción semántica de documentación e imágenes, Graphify utiliza **DeepSeek** como motor de lenguaje. La API Key está configurada como variable de entorno del sistema en Windows:
```powershell
[System.Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY', 'sk-...', 'User')
```

### 2. Instalación
El grafo se construye usando `uv` para administrar Python 3.13 de forma aislada:
```powershell
uv tool install "graphifyy[openai,anthropic]" --python 3.13 --force
```

### 3. Comandos disponibles (via pnpm)

| Comando | Qué hace | Costo API |
|---|---|---|
| `pnpm graphify:update` | Actualización incremental AST (solo código) | **Gratis** |
| `pnpm graphify:cluster` | Re-agrupa comunidades y regenera reportes | **Gratis** |
| `pnpm graphify:query "<pregunta>"` | Consulta el grafo en lenguaje natural | **Gratis** |
| `pnpm graphify:path "<A>" "<B>"` | Traza la ruta más corta entre dos componentes | **Gratis** |
| `pnpm graphify:explain "<concepto>"` | Explica un nodo específico del grafo | **Gratis** |
| `pnpm graphify:hooks` | Instala git hooks para auto-actualizar | **Gratis** |

Para regeneración completa desde cero (con extracción semántica de docs/imágenes):
```powershell
graphify . --backend deepseek
graphify cluster-only .
```

---

## 🔍 ¿Qué puedes hacer con Graphify?

### 1. Mostrar la relación entre dos partes del proyecto (`graphify path`)
¿Quieres saber cómo se conecta una vista con el cliente de base de datos o el backend? Puedes trazar el camino más corto entre dos componentes.

*   **Ejemplo:**
    ```powershell
    pnpm graphify:path "orders/page.tsx" "createServiceClient"
    ```

### 2. Explicar una funcionalidad o componente (`graphify explain` / `query`)
Puedes obtener explicaciones contextuales de cualquier concepto del sistema o hacer preguntas complejas de arquitectura en lenguaje natural.

*   **Explicar un componente específico:**
    ```powershell
    pnpm graphify:explain "OrderAssignmentPolicy"
    ```
*   **Preguntar sobre flujos del proyecto:**
    ```powershell
    pnpm graphify:query "¿Cómo funciona el sistema de asignación de motorizados?"
    ```

---

## 📊 Previsualización del Grafo

1.  Abre tu terminal en la raíz del proyecto.
2.  Ejecuta:
    ```powershell
    Start-Process .\graphify-out\graph.html
    ```
3.  Se abrirá un mapa de red 3D/2D interactivo en tu navegador. Puedes hacer clic en los nodos, ver sus conexiones, buscar símbolos y filtrar por comunidades.

---

## 🔄 Actualización
Cuando realices cambios en el código o agregues nuevos archivos:
```powershell
pnpm graphify:update
```
*(Para hacerlo automático tras cada commit: `pnpm graphify:hooks`).*
