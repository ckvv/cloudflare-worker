import type { R2Bucket, R2GetOptions, R2Range } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'

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
      type: file.type,
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
  const options: { range?: { offset?: number, length?: number, suffix?: number } } = {};
  const range = c.req.header('range') || '';

  if(range) {
    const [start, end] = range?.slice(6).split('-').map(v => v ? parseInt(v) : undefined);
    if(start !== undefined) {
      options.range =  {
        offset: start,
        length: end ?  end - start : undefined,
      }
    } else if (end !== undefined) {
      options.range = {
        suffix: end
      }
    }
  }
  const result = await c.env.MY_BUCKET.get(c.req.param('key'), options as any)

  if(!result) {
    return c.body( null, 404)
  }
  const filename = result?.customMetadata?.filename
  if (filename) {
    c.header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
  }

  c.header('ETag', result.etag)
  c.header('Content-Type', result.customMetadata?.type)
  c.header('Accept-Ranges', 'bytes')

  if(options.range) {
    const rangeStart = options.range?.offset ?? 0;
    const rangeEnd = options.range.length ? rangeStart + options.range.length - 1 : result.size - 1;
    c.header('Content-Range', `bytes ${rangeStart}-${rangeEnd}/${result.size}`);
    c.header('Content-Length', `${rangeEnd - rangeStart + 1}`);

    c.status(206)
  } else {
    c.status(200)
    c.header('Content-Length', `${result.size}`);
  }
  
  return c.body((result as any).body)
})

export default app
