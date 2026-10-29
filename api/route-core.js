const DIRECTIONS = ['up', 'right', 'down', 'left'];

export async function chooseRoute(payload, apiKey) {
  if (!apiKey) {
    const error = new Error('Set TYPESAFE_API_KEY in .env.local (or Vercel project Environment Variables) to connect Jev.');
    error.status = 503;
    throw error;
  }
  const { routes } = payload || {};
  if (!Array.isArray(routes) || routes.length < 1 || routes.length > 20 || routes.some(route =>
    !Array.isArray(route.moves) || !route.moves.length || route.moves.some(move => !DIRECTIONS.includes(move)) || route.steps !== route.moves.length
  )) {
    const error = new Error('Invalid route options.');
    error.status = 400;
    throw error;
  }

  const routeInfo = routes.map((route, index) => {
    const turns = route.moves.reduce((count, move, i) => count + (i > 0 && move !== route.moves[i - 1] ? 1 : 0), 0);
    return { option: `route_${index + 1}`, steps: route.steps, turns, moves: route.moves };
  });
  const criteria = Object.fromEntries(routeInfo.map(route => [
    route.option,
    `${route.steps} hops with ${route.turns} turns: ${route.moves.join(', ')}.`,
  ]));

  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'jev-latest',
      state: {
        goal: 'Guide a rabbit through the drawn maze to the carrot.',
        shortestRoutes: routeInfo,
        note: 'Every candidate route has been verified in code to use the minimum possible number of hops.',
      },
      questions: {
        route: {
          type: 'choice',
          instructions: 'All options are equally short and verified to be minimum-hop routes. Which complete route is clearest to follow, with the fewest direction changes?',
          criteria,
        },
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.detail || data?.error || `TypeSafe returned ${response.status}.`);
    error.status = 502;
    throw error;
  }
  const selected = data.answers?.route?.choice;
  const index = Number(String(selected).replace('route_', '')) - 1;
  if (!Number.isInteger(index) || !routes[index]) throw new Error('Jev returned an unknown route.');
  return {
    route: routes[index],
    model: data.model,
    confidence: data.answers?.route?.confidence ?? null,
    probabilities: data.answers?.route?.probabilities ?? {},
    usage: data.usage ?? null,
  };
}
