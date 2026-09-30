// Cloudflare Pages Function — /api/wallpapers
// Reads/writes the shared wallpaper list in a KV namespace bound as WALLPAPERS.
// Requires an environment secret ADMIN_PASS for write access (see README).

const KEY = 'list';
const MAX_ITEMS = 300; // safety cap so the KV value never grows unbounded

async function getList(env) {
  const raw = await env.WALLPAPERS.get(KEY);
  return raw ? JSON.parse(raw) : [];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function isAdmin(request, env) {
  const pass = request.headers.get('x-admin-pass') || '';
  return !!env.ADMIN_PASS && pass === env.ADMIN_PASS;
}

export async function onRequestGet({ env }) {
  const list = await getList(env);
  return json(list);
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  const link = (body.link || '').trim();
  const img = body.img || '';
  const title = (body.title || '').trim().slice(0, 60);

  if (!/^https?:\/\//i.test(link)) return json({ error: 'invalid link' }, 400);
  if (!/^data:image\//.test(img)) return json({ error: 'invalid image' }, 400);
  if (img.length > 2_000_000) return json({ error: 'image too large' }, 413);

  const list = await getList(env);
  const item = { id: crypto.randomUUID(), title, link, img };
  list.unshift(item);
  if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;

  await env.WALLPAPERS.put(KEY, JSON.stringify(list));
  return json(item);
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'missing id' }, 400);

  const list = await getList(env);
  const next = list.filter(w => w.id !== id);
  await env.WALLPAPERS.put(KEY, JSON.stringify(next));
  return json({ ok: true });
}
