const fs = require('fs');
function read(file) { return fs.readFileSync(file, 'utf8').toLowerCase(); }
function assert(ok, message) { if (!ok) throw new Error(message); }

const commandCenter = read('homepage-command-center.js');
const wallHtml = read('wall-of-fame.html');
const wallJs = read('wall-of-fame.js');
const wheel = read('daily-wheel.html');
const casino = read('casino-consumer.js');
const store = read('point-store.html');

assert(commandCenter.includes('backpack reward — while supplies last'), 'Homepage backpack target must include supply notice');
assert(wallHtml.includes('physical prize available while supplies last'), 'Wall of Fame must disclose physical prize availability');
assert((wallJs.match(/while supplies last/g) || []).length >= 4, 'Every backpack win state must include supply notice');
assert(wheel.includes('physical prizes and merchandise:</strong> available while supplies last'), 'Daily wheel must disclose limited physical inventory');
assert((casino.match(/while supplies last/g) || []).length >= 3, 'Casino shirt giveaway and raffle references must include supply notices');
assert(store.includes('physical merchandise rewards are available while supplies last'), 'Point Store must disclose limited merchandise inventory');

console.log('Reward supply diagnostic passed: physical prize and merchandise promises include while-supplies-last notices.');
