const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://shiragoraly.onrender.com';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', SITE_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Step 1: redirect to GitHub authorization page
app.get('/auth', (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scope: 'repo',
    redirect_uri: `${req.protocol}://${req.get('host')}/callback`,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Step 2: GitHub redirects back with a code — exchange it for an access token
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const data = await response.json();

    // Post token back to the CMS window and close
    res.send(`<!DOCTYPE html><html><body><script>
      (window.opener || window.parent).postMessage(
        'authorization:github:success:${JSON.stringify(data)}',
        '${SITE_ORIGIN}'
      );
      window.close();
    </script></body></html>`);
  } catch (err) {
    res.status(500).send('OAuth error: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`OAuth proxy running on port ${PORT}`));
