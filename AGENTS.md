# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 14 homelab dashboard named `privstack`.
Application routes live in `app/`, including pages, setup/login screens, and
API routes under `app/api/`. Shared UI is organized by domain in `components/`:
dashboard layout pieces, app launcher components, and widgets in
`components/widgets/`. Server-side helpers and integrations are in `lib/`,
including auth, SQLite access, settings, widget registration, and service
clients. Shared type declarations are in `types/`; static assets belong in
`public/`. Deployment artifacts are at the root: `Dockerfile`,
`docker-compose.yml`, `DEPLOYMENT.md`, and `DEPLOY_TO_SERVER.md`.

## Build, Test, and Development Commands

- `npm install`: install dependencies.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: compile the production build and catch type/build errors.
- `npm run start`: run the compiled production app after `npm run build`.
- `npm run lint`: run the configured Next.js lint command.
- `docker compose up -d`: run the app with the provided Compose setup.

## Coding Style & Naming Conventions

Use TypeScript with strict compiler settings and prefer the `@/` path alias for
root-relative imports. Components use PascalCase filenames and exports, for
example `components/widgets/SystemStats.tsx`. API routes follow Next.js App
Router conventions: `app/api/<feature>/route.ts`. Keep integration logic in
`lib/` instead of components. Follow the existing formatting style: two-space
indentation, single quotes, semicolons, and Tailwind utility classes.

## Testing Guidelines

No dedicated test framework or test script is currently configured. Before
submitting changes, run `npm run lint` and `npm run build`. For new tests, add a
project script and keep files close to the code under test using `*.test.ts` or
`*.test.tsx`. Prioritize API routes, database/settings behavior, auth flows, and
service-client error handling.

## Commit & Pull Request Guidelines

Recent commits use concise, imperative messages such as `Fix database directory
ownership for node user` and `Improve error reporting in setup and create-admin
endpoint`. Keep the first line focused on the behavioral change. Pull requests
should include a short summary, validation steps run, linked issue or context,
and screenshots for visible UI changes. Note any new environment variables,
Docker volume changes, or migration/setup implications.

## Security & Configuration Tips

Do not commit secrets, tokens, service URLs with credentials, or local SQLite
data. Keep configuration changes documented in the deployment notes when they
affect Docker, authentication, or first-run setup. Validate user-controlled data
with existing schema patterns before writing to the database or calling external
services.
