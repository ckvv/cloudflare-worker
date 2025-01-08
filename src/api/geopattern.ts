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

app.get('/', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@ckpack/geopattern</title>
</head>
<style>
  html,
  body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  #geo-pattern {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #geo-pattern-input {
    padding: .5em 1em;
  }
</style>

<body>
  <div id="geo-pattern">
    <input id="geo-pattern-input" onchange="handlerChange" />
  </div>
</body>
<script type="module">
  import { GeoPattern } from "https://cdn.jsdelivr.net/npm/@ckpack/geopattern@0.0.2/dist/index.min.js";

  const BG = document.querySelector('#geo-pattern')
  function makePattern(value = '') {
    BG.style.backgroundImage = GeoPattern.generate(value, {
      color: '#3231aa',
    }).toDataUrl()
  }

  document.querySelector('#geo-pattern-input').addEventListener('input', (e) => {
    makePattern(e.target.value)
  })
  makePattern()
</script>

</html>`)
})

export default app
