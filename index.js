const Koa = require('koa')
const Router = require('koa-router')
const { Client } = require('pg')
const client = new Client({
  connectionString: process.env.DATABASE_URL
})

const app = new Koa();
const router = new Router();

router.get('/api/chords', async (ctx, next) => {
  const result = await client.query("select ID, info->'artist_name' artist_name, info->'song_name' song_name, tab_content lyrics from chords limit 100")
  ctx.response.body = result.rows
});

app
  .use(router.routes())
  .use(router.allowedMethods())

async function init() {
  await client.connect()
  await app.listen(
    process.env.PORT
      ? parseInt(process.env.PORT)
      : 3000
  )
}

init().then().catch(err => {
  console.error(err)
})