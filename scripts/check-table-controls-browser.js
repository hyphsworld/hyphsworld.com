// Real pages and controls; auth and room persistence are isolated from production.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const owned=new Set(['table-game.js','table-rules.js','table-room-actions.js','dominos.js']);
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]) {
      const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>{
        const u=new URL(route.request().url()),file=path.resolve(root,'.'+u.pathname);
        if(u.hostname!=='hyphsworld.com')return route.abort();
        if(path.extname(file)==='.js'&&!owned.has(path.basename(file)))return route.fulfill({contentType:'text/javascript',body:''});
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      await page.addInitScript(()=>{
        window.__tableState={log:[]};window.__writes=0;window.__failNext=false;
        const client={
          rpc:async(name)=>({data:name==='create_table_game_room' ? {ok:true,room:{id:'test-room',room_code:'TEST',max_players:2},state:{log:[]}} : {},error:null}),
          from:(name)=>{
            const q={select(){return q;},eq(){return q;},in(){return q;},order(){return q;},limit(){return Promise.resolve({data:[],error:null});},update(){return q;},maybeSingle(){return Promise.resolve({data:name==='game_state'?{state:window.__tableState}:null,error:null});},
              async upsert(row){window.__writes++;await new Promise(r=>setTimeout(r,40));if(window.__failNext){window.__failNext=false;return {error:{message:'Test save failed'}};}window.__tableState=JSON.parse(JSON.stringify(row.state));return {error:null};},
              then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject);}};return q;
          }
        };
        window.HWAuth={getCurrentUser:async()=>({userId:'test-user',displayName:'Test Player'}),getClient:async()=>client};
        window.HWPoints={get:()=>42,refresh:async()=>42};
      });
      async function fit(dock,stage) {
        const d=page.locator(dock);await d.scrollIntoViewIfNeeded();
        const b=await d.boundingBox(),s=await page.locator(stage).boundingBox();
        assert.ok(b&&s);assert.ok(b.y>=s.y+s.height-2,'Dock must sit below the cards');
        for(const button of await d.locator('button').all()) {
          const rect=await button.boundingBox();if(!rect)continue;
          assert.ok(rect.width>=44&&rect.height>=44,`44px touch target: ${await button.textContent()} ${JSON.stringify(rect)} at ${viewport.width}`);
          assert.ok(rect.x>=-1&&rect.x+rect.width<=viewport.width+1,'Action must fit viewport');
        }
      }
      for(const game of ['poker','spades','blackjack','dice']) {
        await page.goto('https://hyphsworld.com/table-game.html?game='+game);
        await page.waitForFunction(()=>document.querySelector('#tableControls button'));
        const buttons=page.locator('#tableControls button');assert.ok(await buttons.count()>0);
        assert.equal(await page.locator('#tableControls button:not([disabled])').count(),0,'Idle actions stay visible but disabled');
        await page.locator('#tableCreateButton').click();
        await page.waitForFunction(()=>document.body.classList.contains('table-game-active'));
        if(game==='poker') {
          await page.locator('[data-action="poker-round"]').click();
          await page.locator('[data-action="poker-call"]:not([disabled])').waitFor();
          assert.ok(await page.locator('[data-action="poker-check"]').isDisabled());
          assert.ok(await page.locator('#tableResetRoundBtn').isDisabled());
          await page.locator('[data-action="poker-call"]').click();
          await page.waitForFunction(()=>window.__tableState.poker.phase==='flop');
          assert.equal(await page.locator('.table-center-zone .hw-card-row').first().locator('.hw-card').count(),3);
          await page.evaluate(()=>{window.__failNext=true;});
          await page.locator('[data-action="poker-bet"]').click();
          await page.waitForFunction(()=>document.querySelector('#tableStatus').textContent.includes('Move not saved'));
          assert.match(await page.locator('#tableTurnBanner').textContent(),/FLOP/);
          assert.ok(await page.locator('[data-action="poker-bet"]').isEnabled());
          await page.locator('[data-action="poker-fold"]').click();
          await page.locator('[data-action="poker-round"]:not([disabled])').waitFor();
        } else if(game==='spades') {
          await page.locator('[data-action="spades-round"]').click();
          await page.locator('#tableSpadesBid:not([disabled])').waitFor();
          await page.locator('#tableSpadesBid').selectOption('3');
          await page.locator('[data-action="spades-bid"]').click();
          await page.locator('[data-spades-card]:not([disabled])').first().waitFor();
          await page.locator('[data-spades-card]:not([disabled])').first().click();
          await page.locator('[data-action="spades-play"]').click();
          await page.waitForFunction(()=>window.__tableState.spades.hands[0].length===12);
          assert.ok(await page.locator('[data-action="spades-play"]').isDisabled());
        } else if(game==='blackjack') {
          await page.locator('[data-action="blackjack-deal"]').click();
          await page.waitForFunction(()=>window.__tableState.blackjack);
          if(await page.locator('[data-action="blackjack-stand"]').isEnabled()) {
            assert.equal(await page.locator('.card-back').count(),1);
            await page.locator('[data-action="blackjack-stand"]').click();
          }
          await page.locator('[data-action="blackjack-deal"]:not([disabled])').waitFor();
          assert.ok(await page.locator('[data-action="blackjack-hit"]').isDisabled());
        } else {
          await page.locator('[data-action="dice-roll"]').click();
          await page.waitForFunction(()=>window.__tableState.craps?.rollCount===1);
        }
        await fit('.card-control-dock','#tableStage');
        if(viewport.width===390)await page.screenshot({path:`/tmp/hw-table-${game}.png`,fullPage:true});
      }
      await page.goto('https://hyphsworld.com/dominos.html');
      if(await page.locator('#finishDominoTutorial').isVisible())await page.locator('#finishDominoTutorial').click();
      await page.locator('#startCpuGame').click();
      await page.waitForFunction(()=>document.body.classList.contains('domino-game-active'));
      for(const id of ['drawTileBtn','passTurnBtn','submitWinBtn'])assert.equal(await page.locator('#'+id).count(),1);
      await fit('.pov-action-dock','#boardTiles');
      await page.goto('https://hyphsworld.com/table-room.html');
      await page.locator('#callBtn:not([disabled])').waitFor();
      await page.locator('#callBtn').click();assert.match(await page.locator('.hand-badge').textContent(),/FLOP/);
      await page.locator('#betBtn').click();assert.match(await page.locator('.hand-badge').textContent(),/TURN/);
      await page.locator('#holdBtn').click();assert.ok(await page.locator('#previewDealBtn').isEnabled());
      await fit('.table-actions','.felt-stage');
      assert.deepEqual(errors,[]);
      console.log('PASS real table controls, save failure recovery, poker preview and reachable docks',viewport.width,viewport.height);
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
