const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const SOUNDCLOUD_TOKEN = process.env.SOUNDCLOUD_TOKEN;
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
const PLAYLIST_ID = process.env.PLAYLIST_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_TOKEN;

app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const messaging = entry?.messaging || entry?.changes?.[0]?.value?.messages;
    if (!messaging) return res.sendStatus(200);

    for (const event of messaging) {
      const text = event?.message?.text || event?.text?.body || '';
      const scUrl = extractSoundCloudUrl(text);
      if (scUrl) {
        console.log('🎵 Lien détecté :', scUrl);
        await addToPlaylist(scUrl);
      }
    }
  } catch (err) {
    console.error('Erreur webhook:', err.message);
  }
  res.sendStatus(200);
});

function extractSoundCloudUrl(text) {
  const match = text.match(/https?:\/\/(www\.)?soundcloud\.com\/[\w\-\/]+/);
  return match ? match[0] : null;
}

async function addToPlaylist(url) {
  try {
    const resolve = await axios.get('https://api.soundcloud.com/resolve', {
      params: { url, client_id: SOUNDCLOUD_CLIENT_ID }
    });
    const trackId = resolve.data.id;

    const playlist = await axios.get(
      `https://api.soundcloud.com/playlists/${PLAYLIST_ID}`,
      { headers: { Authorization: `OAuth ${SOUNDCLOUD_TOKEN}` } }
    );
    const tracks = playlist.data.tracks.map(t => ({ id: t.id }));
    tracks.push({ id: trackId });

    await axios.put(
      `https://api.soundcloud.com/playlists/${PLAYLIST_ID}`,
      { playlist: { tracks } },
      { headers: { Authorization: `OAuth ${SOUNDCLOUD_TOKEN}` } }
    );
    console.log('✅ Track ajouté avec succès !');
  } catch (err) {
    console.error('❌ Erreur SoundCloud:', err.message);
  }
}

app.listen(3000, () => console.log('🚀 Serveur lancé'));
