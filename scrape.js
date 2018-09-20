const request = require('request-promise-native')
const fs = require('fs')
const { Client } = require('pg')
const cheerio = require('cheerio')
const client = new Client({
  connectionString: process.env.DATABASE_URL
})

function getPageJson(body) {
  const json = /window\.UGAPP\.store\.page = ([^\n]+);\n/.exec(body)[1]
  const page = JSON.parse(json)
  return page.data
}

async function getChordsOnPage({ pageNr }) {
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

async function transferChords() {
  let pageNr = 1
  while (true) {
    const tabs = await getChordsOnPage({ pageNr })
    for (let tab of tabs) {
      await client.query('insert into chords (ID, info) values ($1, $2) on conflict (ID) do nothing', [tab.id, JSON.stringify(tab)])
    }
    if (tabs.length < 50) {
      break
    }
    pageNr++
  }
}

async function transferTabs() {
  const result = await client.query("select ID, info->'tab_url' tab_url from chords")
  for (let row of result.rows) {
    const chordId = row.id
    const tabUrl = row.tab_url
    console.log('Fetching tab', tabUrl)
    const body = await request(tabUrl)
    const data = getPageJson(body)
    const content = data.tab_view.wiki_tab.content
    await client.query('update chords set tab_content = $2 where ID = $1', [chordId, content])
  }
}

async function init() {
  await client.connect()
  await client.query(`
  CREATE TABLE IF NOT EXISTS public.chords
  (
      id SERIAL NOT NULL PRIMARY KEY,
      info json NOT NULL,
      tab_content text NULL
  )
  `)
  await run()
  await client.end()
}

async function run() {
  // await transferChords();
  await transferTabs();
}

init().then(result => {
  console.log(result)
}).catch(err => {
  console.error(err)
})