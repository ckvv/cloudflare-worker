import { Hono } from 'hono'
import { cors } from 'hono/cors'
import r2 from './api/r2.js'
import packageJSON from '../package.json' assert { type: 'json' };

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
app.get('/', async (c) => c.json({
  name: packageJSON.name,
  version: packageJSON.version,
}))

export default app
