import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const HORIZONTAL = [
  '###########.#', '.#..#.#.##.#.', '..#####.....#', '.#..##...##..',
  '#.##......##.', '.#....#..#..#', '#.#.....##.#.', '.#.#...##.#..',
  '...###.#####.', '..##..#..##..', '....##.####.#', '..###.#..###.',
  '.##...######.', '############.',
];
const VERTICAL = [
  '#############', '.###.#.#####.', '....#.#.#.#..', '###..#.#.#.#.',
  '...####..##.', '.#.####.#...#', '....####.###.', '#.##...##....',
  '.#.###...###.', '.#.##...#....', '..#..###.....', '.##..#....#..',
  '...##.####...', '#############',
];
const COLS = 13, ROWS = 13;
const START = { x: 11, y: 0 }, GOAL = { x: 12, y: 12 };
const DIRECTIONS = [
  { id: 'up', label: 'Up', symbol: '↑', dx: 0, dy: -1, key: 'ArrowUp' },
  { id: 'right', label: 'Right', symbol: '→', dx: 1, dy: 0, key: 'ArrowRight' },
  { id: 'down', label: 'Down', symbol: '↓', dx: 0, dy: 1, key: 'ArrowDown' },
  { id: 'left', label: 'Left', symbol: '←', dx: -1, dy: 0, key: 'ArrowLeft' },
];
const keyOf = p => `${p.x},${p.y}`;

function canMove(p, direction) {
  const x = p.x + direction.dx, y = p.y + direction.dy;
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  if (direction.dx === 1) return VERTICAL[x][y] !== '#';
  if (direction.dx === -1) return VERTICAL[p.x][p.y] !== '#';
  if (direction.dy === 1) return HORIZONTAL[y][x] !== '#';
  return HORIZONTAL[p.y][p.x] !== '#';
}

function findShortestRoutes() {
  const queue = [GOAL], distances = new Map([[keyOf(GOAL), 0]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const d of DIRECTIONS) {
      if (!canMove(p, d)) continue;
      const next = { x: p.x + d.dx, y: p.y + d.dy }, key = keyOf(next);
      if (!distances.has(key)) { distances.set(key, distances.get(keyOf(p)) + 1); queue.push(next); }
    }
  }
  const routes = [];
  function walk(p, moves) {
    if (routes.length >= 20) return;
    if (keyOf(p) === keyOf(GOAL)) {
      routes.push({ steps: moves.length, moves, firstMove: moves[0] });
      return;
    }
    for (const d of DIRECTIONS) {
      if (!canMove(p, d)) continue;
      const next = { x: p.x + d.dx, y: p.y + d.dy };
      if (distances.get(keyOf(next)) === distances.get(keyOf(p)) - 1) walk(next, [...moves, d.id]);
    }
  }
  walk(START, []);
  return routes;
}

function Maze({ player, route }) {
  const size = 100;
  const routePoints = useMemo(() => {
    if (!route) return '';
    let p = START;
    const points = [`${(p.x + .5) * size},${(p.y + .5) * size}`];
    for (const move of route.moves) {
      const d = DIRECTIONS.find(item => item.id === move);
      p = { x: p.x + d.dx, y: p.y + d.dy };
      points.push(`${(p.x + .5) * size},${(p.y + .5) * size}`);
    }
    return points.join(' ');
  }, [route]);
  return <svg className="maze-drawing" viewBox={`0 0 ${COLS * size} ${ROWS * size}`} role="img" aria-label="Reference line maze from the upper entrance to the carrot at the lower right">
    {routePoints && <polyline points={routePoints} fill="none" stroke="#d8dde2" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" opacity=".52" />}
    <g className="maze-walls">
      {HORIZONTAL.flatMap((row, y) => [...row].flatMap((wall, x) => wall === '#' ? <line key={`h${x}-${y}`} x1={x * size} y1={y * size} x2={(x + 1) * size} y2={y * size} /> : []))}
      {VERTICAL.flatMap((column, x) => [...column].flatMap((wall, y) => wall === '#' ? <line key={`v${x}-${y}`} x1={x * size} y1={y * size} x2={x * size} y2={(y + 1) * size} /> : []))}
    </g>
    <circle cx={(GOAL.x + .5) * size} cy={(GOAL.y + .5) * size} r="34" className="marker-halo" />
    <image href="/carrot.svg" x={(GOAL.x + .12) * size} y={(GOAL.y + .1) * size} width="76" height="82" preserveAspectRatio="xMidYMid meet" />
    <circle cx={(player.x + .5) * size} cy={(player.y + .5) * size} r="38" className="marker-halo" />
    <image href="/bunny.svg" x={(player.x + .1) * size} y={(player.y + .08) * size} width="80" height="88" preserveAspectRatio="xMidYMid meet" />
  </svg>;
}

function App() {
  const routes = useMemo(findShortestRoutes, []);
  const best = routes[0]?.steps ?? 0;
  const [player, setPlayer] = useState(START);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Choose a shortest route with Jev, or find one yourself.');
  const [won, setWon] = useState(false);
  const routeProgress = selected && history.every((move, i) => selected.moves[i] === move) && history.length <= selected.moves.length;
  const nextMove = routeProgress ? selected?.moves[history.length] : null;

  const reset = useCallback(() => {
    setPlayer(START); setHistory([]); setWon(false);
  }, []);
  const move = useCallback(id => {
    if (won) return;
    const direction = DIRECTIONS.find(d => d.id === id);
    if (!direction || !canMove(player, direction)) return;
    const next = { x: player.x + direction.dx, y: player.y + direction.dy };
    setPlayer(next); setHistory(old => [...old, id]);
    if (keyOf(next) === keyOf(GOAL)) {
      setWon(true);
      setMessage(`Carrot found in ${history.length + 1} hops${history.length + 1 === best ? ' — shortest route!' : '.'}`);
    }
  }, [best, history.length, player, won]);

  useEffect(() => {
    const onKey = event => {
      const direction = DIRECTIONS.find(d => d.key === event.key);
      if (direction) { event.preventDefault(); move(direction.id); }
      if (event.key.toLowerCase() === 'r') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, reset]);

  async function askJev() {
    setLoading(true); setMessage('Jev is comparing the verified shortest routes…');
    if (history.length) reset();
    const started = performance.now();
    try {
      const response = await fetch('/api/choose-route', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ routes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Jev could not choose a route.');
      const routeIndex = routes.findIndex(route => route.moves.join(',') === data.route.moves.join(','));
      const probability = data.probabilities?.[`route_${routeIndex + 1}`] ?? null;
      setSelected(data.route);
      setMetrics({ model: data.model, confidence: data.confidence, probability, probabilities: data.probabilities, usage: data.usage, latency: Math.round(performance.now() - started), routeIndex });
      setMessage(`Jev picked route ${routeIndex + 1} of ${routes.length}. Follow the move list below.`);
      setWon(false);
    } catch (error) {
      setMessage(error.message);
    } finally { setLoading(false); }
  }

  const turns = selected ? selected.moves.reduce((n, move, i) => n + (i > 0 && move !== selected.moves[i - 1] ? 1 : 0), 0) : null;
  const progress = selected && routeProgress ? Math.min(history.length, selected.steps) : 0;
  const moveLabel = id => DIRECTIONS.find(d => d.id === id);

  return <main className="app-shell">
    <div className="workspace-head">
      <div className="wordmark"><span className="wordmark-icon">◈</span><span>BUNNY MAZE <i>/ SHORTEST ROUTE</i></span></div>
      <div className="head-state"><span className="state-dot" />{loading ? 'JEV THINKING' : metrics ? 'JEV CONNECTED' : 'READY TO PLAY'}</div>
    </div>
    <section className="game-grid">
      <div className="play-column">
        <div className="panel board-panel">
          <div className="board-heading">
            <div><div className="kicker">MAZE PUZZLE <span>·</span> 01</div><h1>Get Bun to the carrot</h1><p>Find a shortest path. Every hop counts.</p></div>
            <div className="hop-counter"><span className="counter-label">YOUR HOPS</span><strong>{history.length}<small> / {best}</small></strong></div>
          </div>
          <div className="maze-frame"><Maze player={player} route={selected} /></div>
          <div className="board-toolbar">
            <div className="key-hint"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><span>move Bun</span></div>
            <div className="toolbar-actions"><button className="quiet-button" onClick={reset}>↺ Reset maze</button><button className="quiet-button" onClick={() => { setSelected(null); setMetrics(null); setMessage('Choose a shortest route with Jev, or find one yourself.'); }}>Clear route</button></div>
          </div>
          {won && <div className="win-banner">✦ &nbsp;{history.length === best ? 'Shortest path found!' : 'Carrot found! Try again for the shortest route.'}</div>}
        </div>
        <div className="panel controls-panel">
          <div><div className="kicker">HOP CONTROLS</div><div className="control-caption">Use the arrow keys or tap a direction.</div></div>
          <div className="dpad"><span /><button onClick={() => move('up')} aria-label="Hop up">↑</button><span /><button onClick={() => move('left')} aria-label="Hop left">←</button><button onClick={() => move('down')} aria-label="Hop down">↓</button><button onClick={() => move('right')} aria-label="Hop right">→</button></div>
        </div>
      </div>

      <aside className="panel dashboard">
        <div className="dashboard-title"><div><div className="kicker">JEV ROUTE DESK</div><h2>Movement status</h2></div><span className={`jev-mark ${loading ? 'spinning' : ''}`}>✳</span></div>
        <p className="dashboard-message">{message}</p>
        <button className="jev-button" onClick={askJev} disabled={loading || won}><span className="spark">✦</span><span><b>{loading ? 'Comparing routes…' : 'Ask Jev to choose'}</b><small>{routes.length} shortest paths · {best} hops</small></span><span className="button-arrow">→</span></button>

        <section className="route-section">
          <div className="section-heading"><span>ROUTE MOVES</span><span>{selected ? `${progress} / ${selected.steps}` : 'WAITING FOR JEV'}</span></div>
          {selected ? <>
            <div className="route-progress"><span style={{ width: `${selected.steps ? (progress / selected.steps) * 100 : 0}%` }} /></div>
            <div className="next-move">{nextMove ? <><span className="next-icon">{moveLabel(nextMove).symbol}</span><span><small>NEXT HOP</small><b>{moveLabel(nextMove).label}</b></span></> : routeProgress ? <><span className="next-icon done">✓</span><span><small>ROUTE STATUS</small><b>Route complete</b></span></> : <><span className="next-icon off">!</span><span><small>ROUTE STATUS</small><b>Off Jev’s route</b></span></>}</div>
            <div className="move-list" aria-label="Jev route moves">{selected.moves.map((id, i) => {
              const d = moveLabel(id), done = routeProgress && i < history.length, active = routeProgress && i === history.length;
              return <span key={`${id}-${i}`} className={`move-chip ${done ? 'done' : ''} ${active ? 'active' : ''}`} title={`Hop ${i + 1}: ${d.label}`}><small>{i + 1}</small>{d.symbol}</span>;
            })}</div>
            {!routeProgress && <button className="restart-route" onClick={reset}>Restart at the entrance</button>}
          </> : <div className="empty-route"><span>↳</span><div><b>No route selected</b><small>Jev’s move-by-move plan will appear here.</small></div></div>}
        </section>

        <section className="metrics-section">
          <div className="section-heading"><span>JEV METRICS</span><span>{metrics?.model || 'LOCAL SOLVER'}</span></div>
          <div className="metrics-grid">
            <Metric label="MINIMUM HOPS" value={best} note="verified by BFS" />
            <Metric label="SHORTEST PATHS" value={routes.length} note="equal hop count" />
            <Metric label="ROUTE TURNS" value={turns ?? '—'} note="Jev’s selection" />
            <Metric label="CONFIDENCE" value={metrics?.confidence == null ? '—' : `${Math.round(metrics.confidence * 100)}%`} note={metrics?.probability == null ? 'choice confidence' : `${Math.round(metrics.probability * 100)}% route probability`} />
            <Metric label="INPUT TOKENS" value={metrics?.usage?.input_tokens ?? '—'} note="TypeSafe request" />
            <Metric label="OUTPUT TOKENS" value={metrics?.usage?.output_tokens ?? '—'} note={metrics?.latency ? `${metrics.latency} ms response` : 'TypeSafe response'} />
          </div>
          {metrics?.probabilities && <div className="probability-list"><div className="probability-title">ROUTE PROBABILITIES</div>{routes.map((route, i) => {const value = metrics.probabilities[`route_${i + 1}`] ?? 0;return <div className="probability-row" key={`prob-${i}`}><span>PATH {String(i + 1).padStart(2, '0')}</span><div className="probability-track"><i style={{ width: `${value * 100}%` }} /></div><b>{Math.round(value * 100)}%</b></div>;})}</div>}
        </section>
        <div className="dashboard-foot"><span className="live-dot" />Shortest-hop routes are calculated locally. Jev picks the clearest one.</div>
      </aside>
    </section>
  </main>;
}

function Metric({ label, value, note }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
