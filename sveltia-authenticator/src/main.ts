import { startServer } from './server.js'

const parsedPort = Number.parseInt(process.env.PORT ?? '', 10)
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 8080

const server = await startServer({
  env: process.env,
  host: process.env.HOST ?? '0.0.0.0',
  port,
})

process.on('SIGTERM', () => {
  server.close()
})
