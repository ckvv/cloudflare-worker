import { Hono } from 'hono'
import { z } from 'zod'
import { getRandomInt } from '../utils/index.js'
import { createPng } from '../utils/png.js'

const app = new Hono()

const RGB = z.coerce.number().min(0).max(255)
const SIZE = z.coerce.number().min(0).max(10000)

const SCHEMA = {
  png: z.object({
    w: SIZE.optional(),
    h: SIZE.optional(),
    r: RGB.optional(),
    g: RGB.optional(),
    b: RGB.optional(),
  }).optional().refine((data) => {
    return (data?.r && data.g && data.b) || (!data?.r && !data?.g && !data?.b)
  }),
}

app.get('/random', async (c) => {
  c.header('Content-Type', 'image/png')

  const { w = getRandomInt(1000), h = getRandomInt(1000), r = getRandomInt(255), g = getRandomInt(255), b = getRandomInt(255) } = SCHEMA.png.parse(c.req.query()) || {}

  return c.body(createPng(w, h, { r, g, b }).buffer)
})

app.get('/:w/:h', async (c) => {
  c.header('Content-Type', 'image/png')
  const { r = getRandomInt(255), g = getRandomInt(255), b = getRandomInt(255) } = SCHEMA.png.parse(c.req.query()) || {}

  const w = SIZE.parse(c.req.param('w'))
  const h = SIZE.parse(c.req.param('h'))
  return c.body(createPng(w, h, { r, g, b }).buffer)
})

export default app
