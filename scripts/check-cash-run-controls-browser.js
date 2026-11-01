// Real bundled game, with external services isolated. Check the board stays unobstructed.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const overlap = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{width:320,height:568},{width:390,height:664},{width:430,height:740},{width:844,height:390},{width:1280,height:800}]) {
      const mobile = viewport.width < 1000;
      const context = await browser.newContext({viewport,hasTouch:mobile,isMobile:mobile,reducedMotion:'reduce'});
      const page = await context.newPage(), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.hostname!=='hyphsworld.com')return route.abort();
        if(!url.pathname.startsWith('/games/cash-run/'))return route.fulfill({contentType:'text/javascript',body:''});
        const relative=url.pathname.slice(1)+(url.pathname.endsWith('/')?'index.html':'');
        const file=path.resolve(root,relative);
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
        return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      await page.addInitScript(()=>{
        document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('hw-id-ready'));
        localStorage.setItem('cr-mode','easy');localStorage.setItem('cr-muted','true');
      });
      await page.goto('https://hyphsworld.com/games/cash-run/');
      await page.getByTestId('mode-easy').click();await page.getByTestId('menu-play-btn').click();
      const canvas=page.getByTestId('game-canvas'),dock=page.getByTestId('touch-controls');
      const stick=page.getByTestId('touch-joystick'),pause=page.getByTestId('touch-pause');
      await canvas.waitFor();await dock.scrollIntoViewIfNeeded();
      const board=await canvas.boundingBox(),controls=await dock.boundingBox(),analog=await stick.boundingBox(),pauseBox=await pause.boundingBox();
      assert.ok(!overlap(board,analog),'Joystick must not cover the maze');
      assert.ok(!overlap(board,pauseBox),'Pause must not cover the maze');
      assert.ok(!overlap(board,controls),'Control dock must not cover the maze');
      assert.ok(analog.x>=controls.x-1&&analog.y>=controls.y-1&&analog.x+analog.width<=controls.x+controls.width+1&&analog.y+analog.height<=controls.y+controls.height+1,'Joystick must fit inside its dock');
      if(mobile){
        assert.ok(board.y>=-1&&board.y+board.height<=viewport.height+1,'Full maze must remain visible when the controls are in view');
        assert.ok(analog.y>=-1&&analog.y+analog.height<=viewport.height+1,'Joystick must remain visible with the board');
      }
      assert.ok(pauseBox.width>=44&&pauseBox.height>=44);
      const cx=analog.x+analog.width/2,cy=analog.y+analog.height/2;
      await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+40,cy,{steps:5});
      await page.waitForFunction(()=>document.querySelector('[data-testid="touch-joystick-knob"]').style.transform!=='translate(0px, 0px)');
      assert.ok(!overlap(await canvas.boundingBox(),await stick.boundingBox()),'Dragging cannot move the joystick back over the board');
      await page.mouse.up();
      await page.waitForFunction(()=>document.querySelector('[data-testid="touch-joystick-knob"]').style.transform==='translate(0px, 0px)');
      await pause.click();assert.match(await page.getByTestId('game-pause-btn').textContent(),/Resume/);
      await pause.click();assert.match(await page.getByTestId('game-pause-btn').textContent(),/Pause/);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`/tmp/cash-run-controls-${viewport.width}x${viewport.height}.png`});
      console.log('PASS Chase the Bag unobstructed maze, visible dock, drag/release and pause/resume',viewport.width,viewport.height);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
