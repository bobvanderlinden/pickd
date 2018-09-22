const request = require('request-promise-native')
const fs = require('fs')
const db = require('./db')

function getPageJson(body) {
  const json = /window\.UGAPP\.store\.page = ([^\n]+);\n/.exec(body)[1]
  const page = JSON.parse(json)
  return page.data
}

async function getSongsOnPage({ pageNr }) {
  console.log('Fetching page', pageNr)
  const body = await request.get({
    url: 'https://www.ultimate-guitar.com/explore',
    qs: {
      order: 'hitstotal_desc',
      page: pageNr,
      type: ['Chords']
    }
  })
  return getPageJson(body).data.tabs
}

async function transferSongs(client) {
  let pageNr = 1
  while (true) {
    const songs = await getSongsOnPage({ pageNr })
    for (let songInfo of songs) {
      await client.query('insert into songs (ID, info) values ($1, $2) on conflict (ID) do nothing', [tab.id, JSON.stringify(songInfo)])
    }
    if (tabs.length < 50) {
      break
    }
    pageNr++
  }
}

async function transferSongLyrics(client) {
  const result = await client.query("select ID, info->'tab_url' tab_url from songs where tab_content is null")
  for (let row of result.rows) {
    const songId = row.id
    const tabUrl = row.tab_url
    console.log('Fetching tab', tabUrl)
    const body = await request(tabUrl)
    const data = getPageJson(body)
    const content = data.tab_view.wiki_tab.content
    await client.query('update songs set tab_content = $2 where ID = $1', [songId, content])
  }
}

async function init() {
  await db.use(run)
}

async function run(client) {
  await transferSongs(client);
  await transferSongLyrics(client);
}

init().then(result => {
  console.log(result)
}).catch(err => {
  console.error(err)
  process.exit(1)
})