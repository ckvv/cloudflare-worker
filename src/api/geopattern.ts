import { GeoPattern } from '@ckpack/geopattern'
import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono()

const SCHEMA = {
  GeoPattern: z.object({
    color: z.string().optional(),
  }).optional(),
}

app.get('/:filename{.+\\.svg}', async (c) => {
  c.header('Content-Type', 'image/svg+xml')
  const options = SCHEMA.GeoPattern.parse(c.req.query())
  return c.body(GeoPattern.generate(c.req.param('filename').slice(0, -4), options).svg)
})

export default app
