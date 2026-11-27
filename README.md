# AI Expert Chat

Aplicación web full-stack que permite interactuar con un asistente de inteligencia artificial especializado en gastronomía. El asistente está orientado a proporcionar información sobre recetas, técnicas culinarias y sustitución de ingredientes, manteniendo el contexto de las conversaciones.

El proyecto integra autenticación, gestión de usuarios y roles, persistencia de conversaciones y mensajes, configuración del asistente e integración con un proveedor de inteligencia artificial.

## Objetivos del proyecto

- Desarrollar una aplicación web full-stack con Next.js y React.
- Integrar un asistente de inteligencia artificial especializado en gastronomía.
- Implementar autenticación y autorización mediante roles.
- Almacenar usuarios, conversaciones y mensajes en una base de datos PostgreSQL.
- Permitir la administración de usuarios y la configuración del asistente.
- Mantener la seguridad de las credenciales y de las sesiones de los usuarios.

## Funcionalidades principales

### Asistente gastronómico

- Chat especializado en recetas, técnicas culinarias y sustitución de ingredientes.
- Integración con el modelo de inteligencia artificial mediante Groq.
- Conservación del contexto de la conversación.
- Representación de respuestas mediante Markdown y expresiones matemáticas.
- Configuración del comportamiento del asistente mediante un System Prompt.

### Usuarios y autenticación

- Registro e inicio de sesión.
- Autenticación mediante Supabase Auth.
- Gestión de perfiles de usuario.
- Control de acceso basado en roles: `ADMIN` y `USER`.
- Posibilidad de habilitar e inhabilitar cuentas.
- Validación de sesiones e invalidación de sesiones anteriores cuando se inhabilita una cuenta.

### Conversaciones

- Creación y consulta de conversaciones.
- Persistencia de mensajes.
- Recuperación del historial de conversaciones.
- Asociación de cada conversación con su usuario correspondiente.
- Protección para impedir que un usuario acceda a conversaciones de otro.

### Panel de administración

- Consulta de estadísticas.
- Visualización y gestión de usuarios.
- Modificación de roles y estado de las cuentas.
- Administración de la configuración del asistente.
- Comprobación de la conexión con Groq.

### Chat de demostración

La aplicación dispone de un chat de demostración que permite interactuar con el asistente sin utilizar el flujo habitual del chat autenticado. Este servicio incorpora limitación de solicitudes mediante Upstash Redis.

## Tecnologías utilizadas

| Tecnología     | Propósito                                 |
| -------------- | ----------------------------------------- |
| Next.js 16     | Framework de la aplicación web y backend  |
| React 19       | Construcción de interfaces                |
| TypeScript     | Tipado estático                           |
| Tailwind CSS 4 | Estilos e interfaz                        |
| Supabase Auth  | Autenticación de usuarios                 |
| PostgreSQL     | Base de datos                             |
| Prisma 7       | Acceso y gestión de datos                 |
| Groq           | Proveedor de inteligencia artificial      |
| Upstash Redis  | Limitación de solicitudes                 |
| React Markdown | Representación de respuestas Markdown     |
| KaTeX          | Representación de expresiones matemáticas |

## Arquitectura general

La aplicación sigue una arquitectura cliente-servidor en la que las solicitudes del usuario son procesadas por el backend antes de comunicarse con el proveedor de inteligencia artificial.

El flujo general es:

**Usuario → Interfaz web → API de Next.js → Validaciones y contexto → Groq → Respuesta al usuario**

Los componentes principales son:

- **Frontend:** interfaces construidas con Next.js, React y Tailwind CSS.
- **Backend:** rutas API de Next.js encargadas de procesar solicitudes, validar permisos y gestionar conversaciones.
- **Autenticación:** Supabase Auth.
- **Persistencia:** PostgreSQL mediante Supabase y Prisma.
- **Inteligencia artificial:** Groq, utilizando el modelo configurado mediante variables de entorno.
- **Control de solicitudes:** Upstash Redis para el chat de demostración.

Las claves privadas y las operaciones que requieren privilegios se mantienen en el servidor.

## Modelo de datos

La aplicación utiliza cuatro modelos principales:

| Modelo            | Descripción                                                 |
| ----------------- | ----------------------------------------------------------- |
| `UserProfile`     | Información del perfil, rol y estado de la cuenta           |
| `Conversation`    | Conversaciones asociadas a cada usuario                     |
| `Message`         | Mensajes enviados por el usuario y respuestas del asistente |
| `AssistantConfig` | Configuración del asistente, especialidad y System Prompt   |

### Relaciones entre modelos

- Un perfil de usuario puede tener múltiples conversaciones.
- Cada conversación pertenece a un único usuario.
- Una conversación puede contener múltiples mensajes.
- Cada mensaje pertenece a una única conversación.
- La eliminación de un perfil elimina sus conversaciones asociadas.
- La eliminación de una conversación elimina sus mensajes asociados.

Los modelos y sus relaciones están definidos en `prisma/schema.prisma`.

### Roles de usuario

Los roles disponibles son:

- `ADMIN`: acceso a las funcionalidades administrativas.
- `USER`: acceso a las funcionalidades habituales de la aplicación.

## Configuración de Supabase y seguridad

La aplicación utiliza Supabase Auth para gestionar la autenticación y PostgreSQL para almacenar los datos.

### Estructura de la base de datos

En el proyecto de Supabase utilizado por la aplicación se encuentran las siguientes tablas:

- `user_profiles`: perfiles, roles y estado de las cuentas.
- `conversations`: conversaciones de los usuarios.
- `messages`: mensajes asociados a las conversaciones.
- `assistant_config`: configuración del asistente gastronómico.

Supabase Auth utiliza adicionalmente la tabla `auth.users` para gestionar las cuentas de autenticación.

### Creación automática de perfiles

La base de datos dispone de un trigger denominado `on_auth_user_created`, asociado a la tabla `auth.users`.

Este trigger ejecuta la función `public.handle_new_user()` después de insertar un nuevo usuario.

La función crea automáticamente un registro en `public.user_profiles` y realiza las siguientes operaciones:

1. Utiliza el identificador del usuario registrado en Supabase Auth.
2. Obtiene el nombre desde los metadatos del usuario (`full_name`).
3. Si no existe un nombre válido, utiliza la parte del correo electrónico anterior al carácter `@`.
4. Si tampoco puede obtener ese dato, asigna el nombre `Usuario`.
5. Asigna el rol inicial `USER`.
6. Establece el estado de la cuenta como habilitado (`enabled = TRUE`).

De esta manera, el perfil se crea automáticamente durante el proceso de registro, sin necesidad de realizar una inserción manual desde el frontend.

### Seguridad mediante Row Level Security (RLS)

Las cuatro tablas principales tienen habilitado Row Level Security (RLS).

Las políticas verificadas en la base de datos establecen las siguientes restricciones:

| Tabla              | Política de acceso                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `user_profiles`    | Los usuarios autenticados pueden consultar su propio perfil.                                |
| `conversations`    | Los usuarios pueden crear, consultar, actualizar y eliminar sus propias conversaciones.     |
| `messages`         | Los usuarios pueden crear y consultar mensajes pertenecientes a sus propias conversaciones. |
| `assistant_config` | No se encontraron políticas RLS para el rol `authenticated`.                                |

Las políticas de acceso utilizan `auth.uid()` para relacionar las operaciones con el identificador del usuario autenticado.

La configuración de `assistant_config` está destinada a la administración desde el backend, evitando que los usuarios habituales accedan directamente a la configuración mediante las políticas RLS.

Las operaciones que requieren privilegios elevados deben ejecutarse desde el servidor y no deben exponer credenciales privadas al navegador.

### Consideraciones para una nueva instalación

El esquema de datos está definido en `prisma/schema.prisma`, pero el repositorio no incluye actualmente un historial de migraciones de Prisma ni un script SQL de inicialización de Supabase.

Por esta razón, la configuración inicial de un proyecto Supabase nuevo requiere preparar previamente las tablas, los tipos enumerados, las relaciones, las políticas RLS, el trigger y la función de creación automática de perfiles, además del registro inicial de configuración del asistente.

La existencia de estos elementos se verificó en la base de datos utilizada por la aplicación desplegada. No se proporciona un procedimiento SQL automatizado para reconstruirlos desde cero.

**Importante:** no se debe asumir que ejecutar `prisma generate` crea las tablas de la base de datos. Este comando genera Prisma Client a partir del esquema definido en el proyecto.

## System Prompt

El comportamiento y las instrucciones del asistente gastronómico se definen mediante un System Prompt configurable desde el panel de administración.

La versión documentada de estas instrucciones, que establece la identidad del asistente, sus límites temáticos, las reglas de seguridad alimentaria, el manejo del contexto conversacional y el formato matemático, se encuentra en [`docs/SYSTEM_PROMPT.md`](docs/SYSTEM_PROMPT.md).

## Requisitos previos

Para ejecutar el proyecto localmente se necesita:

- Node.js 20.9 o superior.
- npm.
- Git.
- Una cuenta y un proyecto de Supabase.
- Una clave de API de Groq.
- Una instancia de Upstash Redis para el control de solicitudes del chat de demostración.

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd ai-expert-chat
```

### 2. Configurar las variables de entorno

Antes de instalar las dependencias, crear los siguientes archivos en la raíz del proyecto.

**Archivo `.env`:**

```env
DATABASE_URL=
```

**Archivo `.env.local`:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Groq
GROQ_API_KEY=
GROQ_MODEL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Completar las variables con los valores correspondientes a los servicios configurados.

La variable `DATABASE_URL` debe contener la cadena de conexión PostgreSQL de Supabase. Las demás variables corresponden a las credenciales y configuraciones de los servicios externos.

**Importante:** las claves privadas, especialmente `SUPABASE_SECRET_KEY`, `GROQ_API_KEY` y `UPSTASH_REDIS_REST_TOKEN`, no deben exponerse en el navegador ni publicarse en el repositorio.

Los archivos `.env` y `.env.local` están excluidos del control de versiones.

### 3. Configurar la base de datos

Crear y configurar un proyecto PostgreSQL en Supabase.

El esquema de datos de la aplicación se encuentra definido en:

```text
prisma/schema.prisma
```

La configuración de Prisma se encuentra en:

```text
prisma.config.ts
```

La variable `DATABASE_URL` debe contener la cadena de conexión correspondiente a la base de datos.

Antes de ejecutar la aplicación, la base de datos debe contar con la estructura y los elementos de Supabase descritos en la sección **Configuración de Supabase y seguridad**.

**Nota:** el repositorio no incluye actualmente migraciones de Prisma ni scripts SQL de inicialización. Por tanto, no dispone de un procedimiento automatizado para preparar una base de datos nueva. La estructura de la base de datos debe configurarse previamente de acuerdo con los modelos, relaciones y requisitos de autenticación y seguridad del proyecto.

### 4. Instalar dependencias

```bash
npm install
```

Durante la instalación, npm ejecuta automáticamente el script `postinstall`, que genera Prisma Client mediante `prisma generate`.

Si se modifica `prisma/schema.prisma`, ejecutar nuevamente:

```bash
npx prisma generate
```

### 5. Ejecutar la aplicación

```bash
npm run dev
```

Abrir la siguiente dirección en el navegador:

```text
http://localhost:3000
```

## Scripts disponibles

| Comando               | Descripción                                                                             |
| --------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`         | Inicia el servidor de desarrollo                                                        |
| `npm run build`       | Genera la compilación de producción                                                     |
| `npm run start`       | Inicia la aplicación compilada                                                          |
| `npm run lint`        | Ejecuta ESLint                                                                          |
| `npm run postinstall` | Genera Prisma Client; se ejecuta automáticamente durante la instalación de dependencias |

## Preguntas de demostración

La demostración del asistente utiliza una secuencia de once preguntas relacionadas con la preparación de una pasta cremosa con pollo. Estas permiten explorar diferentes capacidades del asistente y comprobar el mantenimiento del contexto conversacional.

1. Quiero preparar una pasta cremosa con pollo para 4 personas.

2. ¿Cómo debo saltear el pollo antes de incorporarlo a la salsa? Quiero que quede dorado y no quede seco.

3. No tengo crema de leche, ¿cómo puedo sustituirla?

4. Ya no serán 4 personas sino 8, ¿cómo debo ajustar la receta manteniendo las mismas proporciones?

5. Inicialmente utilizamos 120 ml de crema de leche en la receta cuando era para 4 personas, pero si finalmente será para 10 personas, ¿cuánta crema de leche debo utilizar? Explícame el ajuste mediante expresiones matemáticas.

6. ¿Cuál es la temperatura interna que debe alcanzar el pollo para considerarse seguro para el consumo y cómo puedo comprobarla?

7. Teniendo en cuenta los cambios que hemos realizado, como el sustituto para la crema de leche y el ajuste de la receta para un total de 10 personas, dame un resumen de la lista de ingredientes y las cantidades.

8. Dame el nombre de los integrantes de la banda Led Zeppelin.

9. Quiero duplicar la salsa pero no recuerdo la cantidad que habíamos establecido para las 10 personas. ¿Cuánto ingrediente sustituto debo utilizar?

10. Si uno de los ingredientes de la receta se ve raro, ¿cómo puedo sustituirlo?

11. Me sobró un poco de pasta y quiero guardarla para consumirla el día de mañana. ¿Cómo me recomiendas guardarla y qué precauciones debo tener?

## Video de demostración

Se encuentra disponible un video que presenta AI Expert Chat, explica su funcionamiento y demuestra sus principales funcionalidades, incluyendo la interacción con el asistente gastronómico y las herramientas de administración.

**Video de demostración y explicación de la aplicación:**

[AI Expert Chat - Demostración y explicación](https://youtu.be/_IBLBqT24hg)

## Despliegue

La aplicación se encuentra desplegada en producción mediante **Vercel** y utiliza servicios externos para la autenticación, persistencia de datos y procesamiento de solicitudes de inteligencia artificial.

**URL de producción:**

[https://ai-expert-chat-liard.vercel.app](https://ai-expert-chat-liard.vercel.app)

### Servicios utilizados

- **Vercel:** alojamiento y despliegue de la aplicación Next.js.
- **Supabase:** autenticación de usuarios y base de datos PostgreSQL.
- **Groq:** proveedor del modelo de inteligencia artificial.
- **Upstash Redis:** almacenamiento utilizado para la limitación de solicitudes.

### Configuración del entorno de producción

Las variables de entorno necesarias se configuran directamente en Vercel, sin exponer credenciales en el código fuente.

La configuración contempla:

- URL y clave pública de Supabase.
- Clave secreta de Supabase.
- Cadena de conexión a PostgreSQL.
- Clave de API y modelo de Groq.
- URL y token de acceso de Upstash Redis.

### Verificación del despliegue

Después del despliegue se realizaron pruebas funcionales en el entorno de producción para comprobar:

- Disponibilidad de la aplicación y navegación entre sus páginas.
- Registro, confirmación de correo electrónico e inicio de sesión.
- Control de acceso según los roles `ADMIN` y `USER`.
- Funcionamiento del chat principal y del chat de demostración.
- Comunicación con el asistente de inteligencia artificial.
- Persistencia y recuperación de conversaciones y mensajes.
- Funcionamiento del panel de administración.
- Gestión de usuarios y estadísticas generales.

Los resultados de las pruebas realizadas fueron satisfactorios.

## Autoría

**Juan Diego Muñetón Herrera**

Universidad de Antioquia

Asignatura: Ingeniería Web

Proyecto académico individual desarrollado como parte de la asignatura Ingeniería Web.
