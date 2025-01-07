import { Hono } from 'hono'
import { cors } from 'hono/cors'
import r2 from './api/r2'

const app = new Hono()

app.onError((error, c) => {
  console.log(error)
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

app.route('/r2', r2)

export default app
