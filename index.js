const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// 👇 Tu rempliras ces valeurs à l'étape 4
const SOUNDCLOUD_TOKEN = process.env.SOUNDCLOUD_TOKEN;
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
const PLAYLIST_ID = process.env.PLAYLIST_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Vérification du webhook Meta
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Réception des messages Instagram
app.post('/webhook', async (req, res) => {
  const messages = req.body?.entry?.[0]?.messaging;
  if (!messages) return res.sendStatus(200);

  for (const event of messages) {
    const text = event?.message?.text || '';
    const scUrl = extractSoundCloudUrl(text);
    if (scUrl) {
      console.log('🎵 Lien détecté :', scUrl);
      await addToPlaylist(scUrl);
    }
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
    console.error('❌ Erreur :', err.message);
  }
}

app.listen(3000, () => console.log('🚀 Serveur lancé'));
