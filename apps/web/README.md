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

## Sentry chat with Ollama

Set these variables in `apps/web/.env.local` or in the server environment and restart the application.

```dotenv
CHAT_OLLAMA_URL=https://your-domain.ngrok-free.dev/api/chat
CHAT_OLLAMA_MODEL=medgemma:27b
```

The server calls Ollama's native API. If Next.js and Ollama run on the same machine, you can use `http://localhost:11434/api/chat`. To attach images, use a model with vision capability. You can list the installed models with `ollama list` or `GET /api/tags`. [Chat API](https://docs.ollama.com/api/chat) · [Vision](https://docs.ollama.com/capabilities/vision) · [Model list](https://docs.ollama.com/api/tags)

To expose Ollama through ngrok, configure the traffic policy to rewrite `Host` to `localhost`. If you enable Basic Auth in ngrok, store the `Basic <encoded credentials>` header in `CHAT_OLLAMA_AUTHORIZATION`, only in the server environment. [Ollama on ngrok guide](https://ngrok.com/docs/universal-gateway/examples/ollama)

`SOMA_OFFLINE=true` disables the chat. The planner has its own configuration in `PLANNER_PROVIDER` and `OLLAMA_*`.

For space health queries, Sentry first uses the configured model to
propose up to ten terms from the same catalog that Swift uses. The server sends
only those terms to [the research library](https://rag-nasa-search.onrender.com/api/research/search/)
and adds up to two excerpts to the next model call. The chat keeps the
response in Markdown, the search status and the sources with their location.
`research.vocabulary.ts` mirrors the vocabulary, aliases and fallback
rules of the Swift application. Update both projections when the catalog changes.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
