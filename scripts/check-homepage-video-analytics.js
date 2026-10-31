const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../homepage-video-analytics.js'), 'utf8');

function setup(hasAnalytics = true, hasVideo = true) {
  const video = new EventTarget();
  Object.assign(video, { dataset: {}, duration: 100, currentTime: 0, paused: false, seeking: false });
  const events = [];
  const window = { location: { href: 'https://hyphsworld.com/?private=query' } };
  if (hasAnalytics) window.gtag = (...args) => events.push(args);
  const document = { readyState: 'complete', querySelector: () => hasVideo ? video : null };
  const context = vm.createContext({ window, document, URL });
  vm.runInContext(source, context);
  return { video, events, context, emit: name => video.dispatchEvent(new Event(name)) };
}

const normal = setup();
normal.emit('playing');
normal.emit('playing');
for (const time of [25, 25, 50, 75, 100]) {
  normal.video.currentTime = time;
  normal.emit('timeupdate');
}
normal.emit('ended');
normal.emit('ended');
assert.deepEqual(normal.events.map(event => event[1]), [
  'video_start', 'video_progress', 'video_progress', 'video_progress', 'video_complete'
]);
assert.deepEqual(normal.events.slice(1, 4).map(event => event[2].video_percent), [25, 50, 75]);
assert.equal(normal.events[0][2].video_url, 'https://hyphsworld.com/who-is-hyph-life.mp4');

const seek = setup();
seek.emit('playing');
seek.video.seeking = true;
seek.video.currentTime = 60;
seek.emit('timeupdate');
seek.video.seeking = false;
seek.emit('seeked');
seek.emit('timeupdate');
assert.equal(seek.events.length, 1, 'Seeking must not report skipped progress');
seek.video.currentTime = 75;
seek.emit('timeupdate');
assert.equal(seek.events[1][2].video_percent, 75);
seek.video.currentTime = 0;
seek.emit('seeked');
seek.video.currentTime = 75;
seek.emit('timeupdate');
assert.equal(seek.events.filter(event => event[2].video_percent === 75).length, 1);

const paused = setup();
paused.emit('playing');
paused.video.paused = true;
paused.video.currentTime = 50;
paused.emit('timeupdate');
assert.equal(paused.events.length, 1);
vm.runInContext(source, paused.context);
paused.emit('playing');
assert.equal(paused.events.length, 1, 'Repeated script load must not duplicate listeners');

const unknown = setup();
unknown.video.duration = NaN;
unknown.emit('playing');
unknown.emit('timeupdate');
assert.equal(unknown.events.length, 1);
assert.equal(unknown.events[0][2].video_duration, 0);
const absent = setup(false);
absent.emit('playing');
absent.emit('timeupdate');
absent.emit('ended');
assert.equal(absent.events.length, 0);
assert.doesNotThrow(() => setup(true, false));
console.log('Homepage video analytics passed: milestones, seeking, resume, duplicate loading, missing analytics and metadata.');
