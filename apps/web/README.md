This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Chat de Sentry con Ollama

Configura estas variables en `apps/web/.env.local` o en el entorno del servidor y reinicia la aplicación.

```dotenv
CHAT_OLLAMA_URL=https://tu-dominio.ngrok-free.dev/api/chat
CHAT_OLLAMA_MODEL=medgemma:27b
```

El servidor llama a la API nativa de Ollama. Si Next.js y Ollama corren en la misma máquina, puedes usar `http://localhost:11434/api/chat`. Para adjuntar imágenes, usa un modelo con capacidad de visión. Puedes consultar los modelos instalados con `ollama list` o `GET /api/tags`. [API de chat](https://docs.ollama.com/api/chat) · [Visión](https://docs.ollama.com/capabilities/vision) · [Listado de modelos](https://docs.ollama.com/api/tags)

Para exponer Ollama por ngrok, configura la política de tráfico para que reescriba `Host` a `localhost`. Si activas Basic Auth en ngrok, guarda el encabezado `Basic <credenciales codificadas>` en `CHAT_OLLAMA_AUTHORIZATION`, solo en el entorno del servidor. [Guía de Ollama en ngrok](https://ngrok.com/docs/universal-gateway/examples/ollama)

`SOMA_OFFLINE=true` deshabilita el chat. El planificador tiene su propia configuración en `PLANNER_PROVIDER` y `OLLAMA_*`.

En las consultas de salud espacial, Sentry usa el modelo configurado primero para
proponer hasta diez términos del mismo catálogo que usa Swift. El servidor envía
solo esos términos a [la biblioteca de investigación](https://rag-nasa-search.onrender.com/api/research/search/)
y añade hasta dos extractos a la siguiente llamada al modelo. El chat conserva la
respuesta en Markdown, el estado de la búsqueda y las fuentes con su ubicación.
`research.vocabulary.ts` refleja el vocabulario, los alias y las reglas de
respaldo de la aplicación Swift. Actualiza ambas proyecciones al cambiar el catálogo.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
