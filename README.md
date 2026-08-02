# medjobs

Fastify + Prisma app that aggregates hospital/medical job listings.

## Local development

```bash
cp .env.example .env
npm install
npm run setup   # prisma generate + db push
npm run dev
```

Visit http://localhost:3000.

## Deploy

Click the button below to deploy to Render (free tier) using the included `render.yaml` blueprint.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=REPO_URL_PLACEHOLDER)

Notes:
- Default DB is SQLite. Render's free web service has no persistent disk, so the DB resets on redeploy/restart — the app repopulates it automatically on startup (`SYNC_ON_START=true`).
- For persistent data, switch to Postgres: set `DATABASE_URL` to a Postgres connection string and change the `provider` in `prisma/schema.prisma` to `"postgresql"`.
# medjobs-main
