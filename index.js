const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors');
const db = require('./db')

const app = new Koa();
const router = new Router();

function where(conditions) {
  conditions = conditions.filter(condition => condition)
  if (conditions.length === 0) {
    return ''
  } else {
    return `where ${conditions.join(' and ')}`
  }
}

function addSqlParameter(sqlParameters, value) {
  sqlParameters.push(value)
  const parameterNr = sqlParameters.length
  return `$${parameterNr}`
}

function array(query) {
  return query === null || query === undefined
    ? query
    : query instanceof Array
    ? query
    : [query]
}

router.get('/api/songs', async (ctx, next) => {
  const sqlParameters = []
  const sqlParameter = addSqlParameter.bind(null, sqlParameters)
  const sql = `
    select ID, info->'artist_name' artist_name, info->'song_name' song_name, tab_content lyrics
    from songs song
    ${where([
      ctx.query.query && ctx.query.query.split(' ').map(word => `%${word}%`).map(sqlParameter).map(sqlParam => `(info->>'artist_name' ilike ${sqlParam} or info->>'song_name' ilike ${sqlParam})`).join(' and '),
      ctx.query.chord && (() => {
        const chordSqlParameters = array(ctx.query.chord).map(sqlParameter).join(', ')
        return `exists (select chord_code from song_chords where song_id = song.id and song_chords.chord_code in (${chordSqlParameters})) and not exists (select chord_code from song_chords where song_id = song.id and song_chords.chord_code not in (${chordSqlParameters}))`
      })()
    ])}
    limit 100
  `
  console.log(sql, sqlParameters)
  const result = await ctx.db.query(sql, sqlParameters)
  ctx.response.body = result.rows
});

router.get('/api/songs/:id', async (ctx, next) => {
  const result = await ctx.db.query("select ID, info->'artist_name' artist_name, info->'song_name' song_name, tab_content lyrics from songs where ID = $1 limit 1", [ctx.params.id])
  ctx.response.status = result.rows.length === 0
    ? 404
    : 200
  ctx.response.body = result.rows.length === 0
    ? 'Song not found'
    : result.rows[0]
})

app
  .use(cors())
  .use(router.routes())
  .use(router.allowedMethods())

async function init() {
  const client = await db.connect()
  app.context.db = client
  const port = process.env.PORT
    ? parseInt(process.env.PORT)
    : 3000
  await app.listen(port)
  console.log('Listening on port', port)
}

init().then(result => {
  console.log(result)
}).catch(err => {
  console.error(err)
  throw err
})