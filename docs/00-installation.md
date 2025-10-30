# Instalación y Configuración

Esta guía contiene todos los pasos necesarios para configurar el entorno de trabajo y ejecutar los scripts de fetch con Playwright.

---

## Requisitos Previos

Antes de ejecutar cualquier script necesitas:
- **Node.js** (LTS recomendado v18+)
- **pnpm** (opcional pero recomendado)
- **PowerShell** (Windows) o terminal en WSL / macOS / Linux

---

## 1. Verificar Node.js

Verifica que Node.js esté instalado:

```bash
node -v
npm -v
```

Si no está instalado, descárgalo desde [nodejs.org](https://nodejs.org/) (versión LTS recomendada).

---

## 2. Instalar pnpm (Recomendado)

pnpm es más rápido y eficiente que npm. Instálalo globalmente:

```powershell
npm i -g pnpm
```

Verifica la instalación:

```powershell
pnpm -v
```

---

## 3. Inicializar Proyecto

En la carpeta de trabajo (ej. `C:\Users\TuUsuario\fetch-playwright`), ejecuta:

```powershell
mkdir "C:\Users\TuUsuario\fetch-playwright"
cd "C:\Users\TuUsuario\fetch-playwright"
pnpm init -y
```

Si prefieres usar npm:

```powershell
npm init -y
```

---

## 4. Instalar Playwright

Instala Playwright como dependencia de desarrollo:

```powershell
pnpm add -D playwright
```

O con npm:

```powershell
npm i -D playwright
```

---

## 5. Instalar Navegadores de Playwright

Playwright requiere navegadores (Chromium, Firefox, WebKit). Instálalos con:

```powershell
npx playwright install
```

**Nota:** Esta descarga puede tardar varios minutos y requiere ~500MB de espacio.

---

## 6. (Opcional) Instalar Playwright Extra + Stealth

Si vas a usar el script `fetch-stealth.js` para evadir detección de bots, instala estas dependencias adicionales:

```powershell
pnpm add playwright-extra @extra/playwright-stealth
```

O con npm:

```powershell
npm i playwright-extra @extra/playwright-stealth
```

---

## 7. Configurar PowerShell (Solo Windows)

Si PowerShell bloquea la ejecución de scripts `.ps1`, ejecuta este comando **una sola vez** como Administrador:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

Esto permite ejecutar scripts locales sin problemas.

---

## 8. Verificar Instalación

Para verificar que todo está correctamente instalado, ejecuta:

```powershell
node -v
pnpm -v
npx playwright --version
```

Deberías ver las versiones de cada herramienta.

---

## Troubleshooting de Instalación

### `node: command not found`
- **Solución:** Instala Node.js desde [nodejs.org](https://nodejs.org/) y reinicia la terminal.

### `npx playwright install` falla por permisos
- **Solución:** Ejecuta PowerShell como Administrador y vuelve a correr el comando.

### Errores de `EACCES` en npm/pnpm
- **Solución (Linux/Mac):** Usa `sudo` o configura npm para instalar globalmente sin sudo: [Guía oficial](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### Playwright no encuentra navegadores después de instalar
- **Solución:** Vuelve a ejecutar `npx playwright install` desde la carpeta del proyecto.

### PowerShell bloquea scripts `.ps1`
- **Solución:** Ejecuta `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force` como Administrador.

---

## Próximos Pasos

Una vez completada la instalación, puedes continuar con:
- [Fetch de Página Única](01-single-page-fetch.md) - Scripts para fetchear una sola página
- [Fetch de 2 Referencias](02-dual-page-fetch.md) - Script para fetchear y fusionar dos páginas

---

## Estructura Final del Proyecto

Después de la instalación, tu proyecto debería verse así:

```
fetch-playwright/
├── node_modules/
├── package.json
├── pnpm-lock.yaml (o package-lock.json)
└── [aquí colocarás los scripts]
```

---

**¡Instalación completa!** Ahora puedes usar los scripts de fetch.
