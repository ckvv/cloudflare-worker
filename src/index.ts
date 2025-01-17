import { Hono } from 'hono'
import { cors } from 'hono/cors'
import packageJSON from '../package.json' assert { type: 'json' }
import geopattern from './api/geopattern.js'
import photos from './api/photos.js'
import r2 from './api/r2.js'

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
app.route('/pattern', geopattern)
app.route('/photos', photos)
app.get('/', async c => c.json({
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
}))

export default app
