#!/usr/bin/env node
const fs = require('fs');

const html = fs.readFileSync('app-player.html', 'utf8');
const player = fs.readFileSync('index-player.js', 'utf8');
const bridge = fs.readFileSync('auth-points-bridge.js', 'utf8');
const issues = [];

function assert(condition, message) {
  if (!condition) issues.push(message);
}

assert(
  html.indexOf('src="cool-points.js"') < html.indexOf('src="index-player.js"'),
  'account bootstrap must start before the music player.'
);
assert(player.includes('await auth.awardSongListen(currentTrackId,trigger)'), 'song rewards must use the authoritative RPC bridge.');
assert(!player.includes('const next=coolPoints+n;setPoints(next)'), 'the player must not display optimistic points.');
assert(player.includes('setPoints(reward.balance)'), 'the player must display the confirmed server balance.');
assert(player.includes("setStatus('Sign in to earn and save Cool Points for song plays.')"), 'logged-out song rewards need a clear sign-in message.');
assert(bridge.includes("rpc('award_song_listen'"), 'the points bridge must call the song-specific RPC.');
assert(bridge.includes('function sourceFrom('), 'generic reward sources must be normalized for Supabase validation.');

if (issues.length) {
  console.error('Music points diagnostic failed:');
  issues.forEach((issue) => console.error('- ' + issue));
  process.exit(1);
}

console.log('Music points diagnostic passed: song rewards are authenticated, server-confirmed, and non-optimistic.');
