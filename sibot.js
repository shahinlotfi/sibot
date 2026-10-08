/**
 * SIbot sitting in the middle of the page, watching the pointer. Ported from Floorstack's PointerBot: there it rides
 * the pointer; here it stays put and only turns to look.
 *
 * Its eyes look toward the pointer, all the way to the rims once the pointer is past the head. While the pointer
 * moves, the pill goes the way the eyes do: up to the head's top edge looking up, down to its bottom edge looking
 * down, tipped a little looking on a diagonal (right end up looking down-right, the other way round from Floorstack),
 * level looking sideways. It leans a little toward the pointer. Once the pointer stops, the pill settles level and the
 * eyes stay on it.
 *
 * Circle the pointer fast and, once the circling ends, it gets dizzy: the pill spins round and round the way it was
 * circled and the pupils roll round their eyes, both slowing to a stop, then it shakes it off and looks again.
 */

/** how far the pill can shift up or down before its edge passes the head's (head radius less half the pill's height) */
const PILL_EDGE = 63.44 - 88.48 / 2;
/** how far a pupil can travel from the middle of its eye: the eye's radii less the pupil's */
const EYE_ROOM = [14.26 - 6.57, 21.39 - 6.57];
/** the head's radius as a share of the svg's width (viewBox 184 wide) */
const HEAD = 63.44 / 184;

/** the pointer this many head radii from the middle (or further) has the eyes at their rims */
const REACH = 2.2;
/** ms for the eyes to turn to a new spot */
const GAZE_MS = 70;
/** after the pointer stops, ms the pill keeps its swing before it settles level */
const GAZE_HOLD = 450;
/** px per 60 fps frame of pointer travel that reads as a move (below it, jitter) */
const MOVING = 0.4;
/** ms for the pill to swing to a new look, and back level once it stops */
const PILL_MS = 110;
/** the most the pill tips looking on a diagonal (degrees; negative: right end up looking down-right) */
const PILL_TURN = -14;
/** the most it leans toward the pointer (degrees) */
const LEAN = 7;
/** ms for the lean to follow */
const LEAN_MS = 160;
/** px per frame of pointer pace that counts toward getting dizzy */
const FAST = 5;
/** ms over which the pointer's turning adds up (an ease, so turning has to keep up) */
const WIND_MS = 900;
/** turning (radians, one way) that winds it up enough to get dizzy: about two and a half quick circles of the pointer */
const DIZZY_AT = 3 * Math.PI;
/** wound up, the circling has ended once the turning has died down to this share of `DIZZY_AT` (or the pointer slows) */
const UNWOUND = 0.4;
/** dizzy: ms spinning, the turns the pill and the pupils make (slowing to a stop), then ms shaking it off */
const DIZZY = { spin: 1800, pill: 3, eyes: 4, shake: 450 };
/** the shake: side to side as a share of its size, degrees, and how many times */
const SHAKE = { x: 0.08, deg: 9, times: 10 };

const easeOut = (u) => 1 - (1 - u) ** 3;

const bot = document.querySelector('.bot');
const floor = document.querySelector('.floor');
const svg = bot.querySelector('.sibot');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** the bot's middle and head radius on screen (px) */
const box = { x: 0, y: 0, r: 1, size: 1 };
const measure = () => {
  // centred in the window at 64 % of its shorter side (sibot.css); not the element's rect, which leans
  box.size = bot.offsetWidth;
  box.x = innerWidth / 2;
  box.y = innerHeight / 2;
  box.r = box.size * HEAD;
};

const target = { x: 0, y: 0 };
/** the pointer is over the page */
let over = false;
/** pointer travel since the last frame, and its recent pace (px per frame) */
const moved = { x: 0, y: 0 };
const pace = { x: 0, y: 0 };
/** where the eyes look: a direction, length up to 1 (1 = the eye's rim) */
const gaze = { x: 0, y: 0 };
/** the look the pill shows: the gaze while moving, nothing once stopped (length 0..1) */
const swing = { x: 0, y: 0 };
let lean = 0;
let lastMove = -Infinity;
/** the pointer's turning lately (radians, + clockwise on screen), and its direction last frame while fast */
let wind = 0;
let dir = null;
/** circled enough to get dizzy, this way (±1), as soon as the circling ends; 0 not yet */
let wound = 0;
/** dizzy since then, spinning this way (±1); the pill's pose when it began */
let dizzy = null;
let frame = 0;
let last = 0;

/** the share of a gap closed in `dt` ms by an ease with time constant `tau` */
const ease = (dt, tau) => (still ? 1 : 1 - Math.exp(-dt / tau));

/** the pill for the look it shows: θ its direction, y down. sin 2θ is ±1 on the diagonals (tipped `PILL_TURN`) and 0
 * straight across or up and down; cos² 2θ is 1 straight up or down (shift to the edge) */
const pill = () => {
  const r = Math.hypot(swing.x, swing.y);
  const th = Math.atan2(swing.y, swing.x);
  return {
    shift: r ? PILL_EDGE * (swing.y / r) * Math.cos(2 * th) ** 2 * r : 0,
    turn: PILL_TURN * Math.sin(2 * th) * r,
  };
};

/** the pupils on the eye's inner rim (less a little), the way the gaze points; a touch cross-eyed, as at rest */
const look = () => {
  const x = gaze.x * EYE_ROOM[0] * 0.92;
  const y = gaze.y * EYE_ROOM[1] * 0.92;
  const cross = 1.7 * (1 - Math.abs(gaze.x));
  return [
    [x + cross, y],
    [x - cross, y],
  ];
};

const roll = (a) => [Math.cos(a) * EYE_ROOM[0] * 0.92, Math.sin(a) * EYE_ROOM[1] * 0.92];

const setPose = (p, [[lx, ly], [rx, ry]]) => {
  const s = svg.style;
  s.setProperty('--sibot-pill-x', '0');
  s.setProperty('--sibot-pill-y', `${p[0]}`);
  s.setProperty('--sibot-pill-r', `${p[1]}`);
  s.setProperty('--sibot-l-x', `${lx}`);
  s.setProperty('--sibot-l-y', `${ly}`);
  s.setProperty('--sibot-r-x', `${rx}`);
  s.setProperty('--sibot-r-y', `${ry}`);
};

const draw = (t) => {
  const d = dizzy ? t - dizzy.t0 : -1;
  let tilt = lean;
  let jolt = 0;
  let eyes = look();
  let { shift, turn } = pill();
  if (dizzy && d < DIZZY.spin) {
    // spinning: the pill turns round from its pose, the pupils roll round the rims half a turn apart
    const u = easeOut(d / DIZZY.spin);
    const phi = dizzy.way * Math.PI * 2 * DIZZY.eyes * u - Math.PI / 2;
    shift = dizzy.shift * (1 - u);
    turn = dizzy.turn * (1 - u) + dizzy.way * 360 * DIZZY.pill * u;
    eyes = [roll(phi), roll(phi + Math.PI)];
  } else if (dizzy) {
    // shaking it off: side to side, dying away, the pupils finding the pointer again
    const v = (d - DIZZY.spin) / DIZZY.shake;
    const w = Math.sin(v * Math.PI * 2 * SHAKE.times) * (1 - v);
    jolt = w * SHAKE.x * box.size * HEAD;
    tilt = w * SHAKE.deg;
    const b = easeOut(v);
    const from = [roll(-Math.PI / 2), roll(Math.PI / 2)];
    eyes = eyes.map((e, i) => [from[i][0] + (e[0] - from[i][0]) * b, from[i][1] + (e[1] - from[i][1]) * b]);
  }
  bot.style.transform = `translateX(${jolt}px) rotate(${tilt}deg)`;
  floor.style.transform = `translateX(${jolt * 0.6}px) scaleX(${1 - Math.abs(tilt) / 90})`;
  setPose([shift, turn], eyes);
};

const step = (t) => {
  const dt = last ? Math.min(50, t - last) : 1000 / 60;
  const f = dt / (1000 / 60);
  last = t;

  // the pointer's pace, smoothed over a few frames so one jittery event doesn't count as a circle
  const p = ease(dt, 40);
  pace.x += (moved.x / f - pace.x) * p;
  pace.y += (moved.y / f - pace.y) * p;
  moved.x = moved.y = 0;
  const run = Math.hypot(pace.x, pace.y);

  // circling fast winds it up; turning back and forth unwinds it
  wind *= Math.exp(-dt / WIND_MS);
  if (run > FAST && !dizzy && !still) {
    const now = { x: pace.x / run, y: pace.y / run };
    if (dir) wind += Math.atan2(dir.x * now.y - dir.y * now.x, dir.x * now.x + dir.y * now.y);
    dir = now;
  } else dir = null;
  if (Math.abs(wind) > DIZZY_AT && !dizzy) wound = Math.sign(wind);
  if (wound && (run <= FAST || Math.abs(wind) < DIZZY_AT * UNWOUND)) {
    dizzy = { t0: t, way: wound, ...pill() };
    wound = 0;
    wind = 0;
  }
  if (dizzy && t - dizzy.t0 > DIZZY.spin + DIZZY.shake) dizzy = null;

  // where the eyes want to be: toward the pointer, at the rims once it's past REACH; straight ahead when it's gone
  let aim = { x: 0, y: 0 };
  if (over) {
    const dx = target.x - box.x;
    const dy = target.y - box.y;
    const reach = box.r * REACH;
    const k = 1 / Math.max(reach, Math.hypot(dx, dy));
    aim = { x: dx * k, y: dy * k };
  }
  if (dizzy) lastMove = -Infinity;
  else if (run > MOVING) lastMove = t;

  const g = ease(dt, GAZE_MS);
  gaze.x += (aim.x - gaze.x) * g;
  gaze.y += (aim.y - gaze.y) * g;
  const s = ease(dt, PILL_MS);
  const moving = t - lastMove <= GAZE_HOLD;
  swing.x += ((moving ? gaze.x : 0) - swing.x) * s;
  swing.y += ((moving ? gaze.y : 0) - swing.y) * s;
  lean += (gaze.x * LEAN - lean) * ease(dt, LEAN_MS);

  draw(t);
  // settled, looking at a pointer that isn't moving: stop until it moves again
  const settled =
    !dizzy &&
    !wound &&
    run < 0.05 &&
    Math.hypot(aim.x - gaze.x, aim.y - gaze.y) < 0.002 &&
    Math.hypot(swing.x, swing.y) < 0.01 &&
    Math.abs(gaze.x * LEAN - lean) < 0.01;
  if (settled) {
    frame = 0;
    last = 0;
    return;
  }
  frame = requestAnimationFrame(step);
};

const wake = () => {
  if (!frame) frame = requestAnimationFrame(step);
};

addEventListener('pointermove', (e) => {
  if (over) {
    moved.x += e.clientX - target.x;
    moved.y += e.clientY - target.y;
  }
  over = true;
  target.x = e.clientX;
  target.y = e.clientY;
  wake();
});
addEventListener('pointerdown', (e) => {
  // a tap: look there, without counting the jump as a move
  over = true;
  target.x = e.clientX;
  target.y = e.clientY;
  wake();
});
document.documentElement.addEventListener('pointerleave', () => {
  over = false;
  wake();
});
addEventListener('resize', () => {
  measure();
  wake();
});

measure();
draw(0);
