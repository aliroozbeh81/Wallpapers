// Cloudflare Pages Function — /api/login
// Checks a submitted password against the ADMIN_PASS secret.
// The real password never ships in the site's HTML/JS.

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return new Response('bad json', { status: 400 }); }

  if (env.ADMIN_PASS && body.pass === env.ADMIN_PASS) {
    return new Response('ok', { status: 200 });
  }
  return new Response('unauthorized', { status: 401 });
}
