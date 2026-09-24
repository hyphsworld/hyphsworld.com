const fs=require('fs');const path=require('path');const root=__dirname;const html=fs.readFileSync(path.join(root,'creator-sixx-figgaz.html'),'utf8');const js=fs.readFileSync(path.join(root,'creator-sixx-figgaz.js'),'utf8');
test('uses the approved artist name and existing master',()=>{expect(html).toMatch(/SIXX FIGGAZ/);expect(html).toMatch(/src="time\.mp3"/)});
test('keeps coach tools owner protected',()=>{expect(html).toMatch(/id="coachOwnerTools" hidden/);expect(js).toMatch(/owner_user_id/);expect(js).toMatch(/auth\.getUser/);expect(html).not.toMatch(/sixxfiggaz6@gmail\.com/i)});
test('links official public music destinations',()=>{expect(html).toMatch(/youtube\.com\/watch\?v=7jLzksAEqS8/);expect(html).toMatch(/music\.apple\.com\/us\/artist\/sixx-figgaz\/418971268/)});
