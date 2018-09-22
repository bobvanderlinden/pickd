const Koa = require('koa')
const Router = require('koa-router')
const cors = require('@koa/cors');
const db = require('./db')

async function run(client) {
  const result = await client.query('select ID, tab_content lyrics from songs where ID not in (select song_id from song_chords)')
  for (let song of result.rows) {
    const songId = song.id
    const lyrics = song.lyrics
    console.log(songId)
    const regex = /\[ch\]([^\[]+)\[\/ch\]/g
    let match
    const chordCodes = new Set()
    while ((match = regex.exec(lyrics))) {
      const chordCode = match[1]
      chordCodes.add(chordCode)
    }

    for (let chordCode of chordCodes) {
      await client.query('insert into song_chords (song_id, chord_code) values ($1, $2) on conflict do nothing', [songId, chordCode])
    }
  }
}

async function init() {
  await db.use(run)
}

init().then().catch(err => {
  console.error(err)
})