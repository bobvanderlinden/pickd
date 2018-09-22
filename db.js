const { Client } = require('pg')

async function connect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  await client.connect()
  return client
}

async function use(fn) {
  const client = await connect()
  try {
    await fn(client)
  } finally {
    await client.end()
  }
}

module.exports = {
  connect,
  use
}