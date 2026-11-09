const assert = require('node:assert/strict');
const r = require('../table-rules.js');
const c = (rank,suit='♠') => ({rank,suit});
const rank = cards => r.best(cards);
assert.equal(rank([c(1),c(2),c(3),c(4),c(5)])[0],8);
assert.equal(rank([c(1),c(2,'♥'),c(3),c(4),c(5)])[1],5);
assert.equal(rank([c(2),c(2,'♥'),c(2,'♦'),c(3),c(3,'♥'),c(3,'♦'),c(1)])[0],6);
assert.ok(r.compare(rank([c(1),c(1,'♥'),c(13),c(9),c(7)]),rank([c(13),c(13,'♥'),c(1),c(9),c(7)]))>0);
for(let run=0;run<100;run++) {
  let s=r.pokerStart();
  assert.equal(s.hand.length,2);assert.equal(s.community.length,0);
  assert.equal(r.pokerActions(s).check,false);assert.equal(r.pokerActions(s).call,true);
  assert.throws(()=>r.pokerMove(s,'check'));
  s=r.pokerMove(s,'call');assert.equal(s.phase,'flop');assert.equal(s.community.length,3);
  s=r.pokerMove(s,'check',()=>0);assert.equal(s.toCall,20);assert.equal(s.phase,'flop');
  s=r.pokerMove(s,'raise');assert.equal(s.phase,'turn');assert.equal(s.community.length,4);
  s=r.pokerMove(s,'bet');assert.equal(s.phase,'river');
  s=r.pokerMove(s,'check',()=>1);assert.equal(s.phase,'done');assert.equal(s.community.length,5);
  assert.equal(s.stack+s.cpuStack+s.pot,2000);
  assert.throws(()=>r.pokerMove(s,'call'));
  const folded=r.pokerMove(r.pokerStart(),'fold');assert.equal(folded.phase,'done');assert.equal(folded.stack+folded.cpuStack,2000);
  let sp=r.spadesStart();assert.equal(sp.hands.flat().length,52);
  assert.throws(()=>r.spadesBid(sp,14));assert.throws(()=>r.spadesBid(sp,-1));assert.throws(()=>r.spadesBid(sp,1.5));
  sp=r.spadesBid(sp,run%14);let plays=0;
  while(sp.phase==='play') {
    const legal=r.legalCards(sp,0);assert.ok(legal.length);
    const illegal=sp.hands[0].map((_,i)=>i).find(i=>!legal.includes(i));
    if(illegal!==undefined)assert.throws(()=>r.spadesPlay(sp,illegal));
    sp=r.spadesPlay(sp,legal[0]);plays++;assert.ok(plays<=13);
  }
  assert.equal(plays,13);assert.equal(sp.tricks.reduce((a,b)=>a+b,0),13);assert.equal(sp.hands.flat().length,0);assert.equal(sp.phase,'done');
}
const follow={hands:[[c(1,'♥'),c(2,'♠')]],trick:[{card:c(5,'♥')}],broken:false};
assert.deepEqual(r.legalCards(follow,0),[0]);
assert.deepEqual(r.legalCards({...follow,trick:[]},0),[0]);
console.log('PASS: poker legal actions, streets, ranking, fold, settlement; 100 complete Spades hands, bids, legal follow-suit and scoring.');
