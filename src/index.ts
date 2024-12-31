import type { R2Bucket } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface Bindings {
  MY_BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '*',
  cors({
    origin: (origin, _c) => origin,
  }),
)

app.get('/', async (c) => {
  const { limit, prefix, cursor, delimiter, startAfter } = c.req.query()
  const result = await c.env.MY_BUCKET.list({
    limit: limit ? Number.parseInt(limit) : undefined,
    prefix,
    cursor,
    delimiter,
    startAfter,
  })
  return c.json(result.objects.map(object => ({
    key: object.key,
    size: object.size,
    uploaded: object.uploaded,
  })))
})

app.post('/:key{.+}', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File
  await c.env.MY_BUCKET.put(c.req.param('key'), file as any, {
    customMetadata: {
      filename: encodeURIComponent(file.name),
    },
  })
  return c.json({})
})

app.delete('/:key{.+}', async (c) => {
  await c.env.MY_BUCKET.delete(c.req.param('key'))
  return c.json({})
})

app.get('/:key{.+}', async (c) => {
  const result = await c.env.MY_BUCKET.get(c.req.param('key'))
  const type = c.req.query('type')

  const filename = result?.customMetadata?.filename
  if (filename) {
    c.header('Content-Disposition', `${type || 'inline'}; filename="${encodeURIComponent(filename)}"`)
  }
  return c.body(result?.body as any)
})

export default app
