# TicketMeLL

Aplicación web estática en español para registrar casos, priorizarlos, seguir su estado, adjuntar imágenes y consultar el historial de cambios. Está preparada para alojarse en Vercel y usa Supabase para compartir los datos y las evidencias entre compañeros.

## Puesta en marcha gratuita

1. Crea un proyecto en [Supabase](https://supabase.com/) y espera a que termine de aprovisionarse.
2. En el panel de Supabase abre **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql). Esto crea las tablas, el registro automático de ediciones, el bucket público de evidencias y sus políticas.
3. En **Project Settings → API** copia el **Project URL** y la clave **anon / publishable**. Nunca uses la clave `service_role` en el navegador.
4. En [`app.js`](app.js), completa `CONFIG.url` y `CONFIG.anonKey` con esos valores. `bucket` debe conservar el valor `evidencias`.
5. Sube este directorio a un repositorio GitHub. En [Vercel](https://vercel.com/) importa ese repositorio y despliega el proyecto con la configuración predeterminada (no requiere build command).
6. Comparte la URL de Vercel con tus compañeros. Los casos se sincronizan al recargar la página.

## Funciones

- Registro de usuario, infraestructura, tema, descripción y evidencia opcional (PNG, JPG, WEBP o GIF de hasta 5 MB).
- Código correlativo `BY100`, `BY101`… que también se puede buscar desde la tabla.
- Fecha automática de registro, prioridad y estado con actualización directa desde la tabla.
- Eliminación de casos con confirmación y Dashboard con estadísticas por usuario, infraestructura, estado y prioridad.
- Historial automático de modificaciones visible al elegir **Ver ediciones**.
- Búsqueda, filtros por prioridad/estado, contadores y descarga de Excel `.xlsx` (con respaldo CSV compatible si la librería de hoja de cálculo no carga).

## Acceso y privacidad

La configuración incluida es un MVP compartido sin cuentas: cualquier persona que tenga la URL puede consultar, registrar, editar y eliminar casos, y las imágenes se sirven mediante enlaces públicos. No incluyas información sensible o confidencial. Para restringir el acceso se debe añadir autenticación (por ejemplo, acceso por correo con Supabase Auth) y ajustar las políticas RLS antes de compartir datos privados.

La app requiere conexión a internet y un proyecto Supabase con la configuración anterior. El alojamiento de Vercel y los servicios de Supabase ofrecen planes gratuitos sujetos a sus límites y condiciones vigentes.
