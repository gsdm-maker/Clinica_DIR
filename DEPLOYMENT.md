# Guía de Despliegue a Producción (Paso a Productivo)

Esta aplicación está construida con **React + Vite** y utiliza **Supabase** como backend. Para pasar a producción, necesitas alojar los archivos estáticos generados (frontend) y configurar las variables de entorno correctas.

Recomendamos usar **Vercel** o **Netlify** por su facilidad de uso y compatibilidad con Vite.

## Opción 1: Despliegue Automático con Vercel (Recomendada)

Vercel está optimizado para aplicaciones frontend y es gratuito para proyectos personales/hobbys.

### 1. Preparar el Repositorio
Asegúrate de que tu código esté subido a **GitHub**, **GitLab** o **Bitbucket**.
- Si no lo has hecho:
  ```bash
  git add .
  git commit -m "Preparando para despliegue"
  git push origin main
  ```

### 2. Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com) y crea una cuenta.
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio de la lista (importar desde GitHub/GitLab).

### 3. Configurar el Proyecto
Vercel detectará automáticamente que es un proyecto **Vite**. La configuración por defecto suele ser correcta:
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 4. Variables de Entorno (IMPORTANTE)
Antes de darle a "Deploy", despliega la sección **"Environment Variables"**. Debes agregar las mismas claves que tienes en tu archivo `.env.development`, pero con los valores de producción (si tienes un proyecto Supabase separado para prod) o los mismos.

Agrega:
- `VITE_SUPABASE_URL`: Tu URL de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Tu clave anónima pública de Supabase.

*(Nota: Vite requiere que las variables empiecen con `VITE_` para ser accesibles en el frontend)*

### 5. Desplegar
Haz clic en **"Deploy"**. Vercel construirá tu proyecto y te dará una URL pública (ej. `tu-proyecto.vercel.app`).

---

## Opción 2: Despliegue Manual (Cualquier Hosting Estático)

Si prefieres usar un servidor tradicional (Apache, Nginx) u otro servicio:

1. **Construir la aplicación:**
   Ejecuta en tu terminal:
   ```bash
   npm run build
   ```
   Esto creará una carpeta llamada `dist/` en la raíz de tu proyecto.

2. **Subir archivos:**
   Sube **todo el contenido** de la carpeta `dist/` a la carpeta pública de tu servidor web (por ejemplo, `public_html` o `/var/www/html`).

3. **Configuración de Servidor (SPA):**
   Como es una "Single Page Application" (SPA), necesitas configurar tu servidor para que redirija todas las rutas a `index.html`.
   - **Para Apache (.htaccess):**
     Crea un archivo `.htaccess` en la raíz con:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```
   - **Para Nginx:**
     ```nginx
     location / {
       try_files $uri $uri/ /index.html;
     }
     ```

## Verificaciones Post-Despliegue

1. **Supabase URL:** Verifica que en el proyecto de Supabase (Dashboard -> Authentication -> URL Configuration), la "Site URL" coincida con tu nuevo dominio de producción (ej. `https://mi-clinica-app.vercel.app`).
2. **Redirecciones Auth:** Si usas login con Google/Magic Link, agrega tu nueva URL a los "Redirect URLs" en Supabase.
3. **Storage CORS:** Si tienes problemas con las imágenes, verifica que las políticas de tu Bucket en Supabase permitan acceso desde tu nuevo dominio (aunque si es público no debería haber problema).

## Optimización de Imágenes
La aplicación ya cuenta con compresión de imágenes integrada (`browser-image-compression`), por lo que no necesitas configurar nada extra en el servidor para esto. Las imágenes se comprimen en el navegador del cliente antes de subir.
