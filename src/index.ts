import type { R2Bucket } from '@cloudflare/workers-types';
import { Hono } from 'hono'
import { cors } from 'hono/cors';

type Bindings = {
  MY_BUCKET: R2Bucket
}

const app = new Hono<{Bindings: Bindings}>()

app.use(
  '*',
  cors({
    origin: (origin, c) => origin,
  })
)

app.get('/', async(c) => {
  const { limit, prefix, cursor, delimiter, startAfter} = c.req.query()
  const result = await c.env.MY_BUCKET.list({
    limit: limit ? parseInt(limit) : undefined,
    prefix,
    cursor,
    delimiter,
    startAfter,
  });
  return c.json(result.objects.map(object => {
    
  }));
})

app.post('/:key{.+}', async(c) => {
  const body = await c.req.parseBody()
  await c.env.MY_BUCKET.put(c.req.param('key'), body['file']);
  return c.json({});
})

app.delete('/:key{.+}', async(c) => {
  await c.env.MY_BUCKET.delete(c.req.param('key'));
  return c.json({});
})

app.get('/:key{.+}', async (c) => {
  const result = await c.env.MY_BUCKET.get(c.req.param('key'))
  return c.body(result?.body);
})

export default app