import { type R2Bucket } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { z } from 'zod'
import { cors } from 'hono/cors'

const SCHEMA = {
  R2ListOptions: z.object({
    limit: z.coerce.number().int().gt(0).lte(1000).optional(),
    prefix: z.string().optional(),
    cursor: z.string().optional(),
    delimiter: z.string().optional(),
    startAfter: z.string().optional(),
  }).optional(),
  R2PutOptions: z.object({
    storageClass: z.enum(['Standard', 'InfrequentAccess']).optional(),
  }).optional(),
  R2GetOptions: z.any().optional(),
}

interface Bindings {
  MY_BUCKET: R2Bucket
  password: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.onError((error, c) => {
  return c.json({
    success: false,
    error,
  })
})

app.use(
  '*',
  cors({
    origin: (origin, _c) => origin || '*',
  }),
)

app.get('/', async (c) => {
  const result = await c.env.MY_BUCKET.list(SCHEMA.R2ListOptions.parse(c.req.query()))
  return c.json(result.objects.map(object => ({
    key: object.key,
    size: object.size,
    uploaded: object.uploaded,
  })))
})

app.post('/:key{.+}', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File;
  const key = c.req.param('key');
  const options = SCHEMA.R2PutOptions.parse(body.options);
  await c.env.MY_BUCKET.put(key, file as any, {
    storageClass: options?.storageClass,
    customMetadata: {
      filename: encodeURIComponent(file.name),
    },
  })
  return c.json({
    size: file.size,
    key,
  });
})

app.delete('/:key{.+}', async (c) => {
  const auth = c.req.header('Authorization');
  if(c.env.password && auth !== c.env.password) {
    throw new Error('password error');
  }
  await c.env.MY_BUCKET.delete(c.req.param('key'))
  return c.json({})
})

app.get('/:key{.+}', async (c) => {
  const result: any = await c.env.MY_BUCKET.get(c.req.param('key'), SCHEMA.R2GetOptions.parse(c.req.query()))

  if(!result) {
    return c.body( null, 404)
  }
  const filename = result?.customMetadata?.filename
  if (filename) {
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
  }
  return c.body(result?.body)
})

export default app
