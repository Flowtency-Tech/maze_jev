import { chooseRoute } from './route-core.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST required.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await chooseRoute(body, process.env.TYPESAFE_API_KEY);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Jev could not choose a route.' });
  }
}
