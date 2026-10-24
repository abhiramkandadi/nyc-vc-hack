const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');const root=path.resolve(__dirname,'../..')+'/';
require('node:module').registerHooks({resolve(s,c,n){if(s.startsWith('./')&&c.parentURL?.startsWith(pathToFileURL(root+'lib/').href)&&!s.endsWith('.ts'))return {url:new URL(s+'.ts',c.parentURL).href,shortCircuit:true};return n(s,c)}});
const {assignUniquePortraits,portraitFor}=require(root+'lib/mockData.ts');
const profiles=require(root+'lib/seededAktaData.json').data;
const media=assignUniquePortraits(profiles);
assert.equal(media['02mqjeu'].src,'/founders/02mqjeu.jpg');assert.equal(media['akta-news-29597966'].src,'/founders/akta-news-29597966.png');
const unknown={id:'unknown-person',founderName:'Alex Example',founderImage:'https://images.unsplash.com/photo-stock',founderAvatar:'https://images.unsplash.com/photo-other',imageIsPlaceholder:true};assert(portraitFor(unknown).startsWith('https://'));assert(!portraitFor(unknown).includes('photo-stock'));
assert.equal(portraitFor({...unknown,imageIsPlaceholder:false,founderImage:'https://example.com/verified.jpg'}),'https://example.com/verified.jpg');assert.equal(Object.keys(media).length,50);assert(Object.values(media).every(m=>!m.src.startsWith('data:')));
console.log('PASS sourced Mark/Jeremy images, curated stock fallback, verified image preservation, all 50 identities');

assert.deepEqual(assignUniquePortraits([...profiles].reverse()),media);console.log("PASS portrait assignments remain stable during re-ranking");

const mediaKey=src=>src.match(/photo-[a-z0-9-]+/)?.[0]??src.match(/pexels-photo-\d+/)?.[0]??src;
assert.equal(new Set(Object.values(media).map(m=>mediaKey(m.src))).size,50,'Every card needs a distinct underlying image, not a different crop of the same photo');assert(Object.values(media).some(m=>m.kind!=='headshot'),'Include varied workspace/technology imagery');
console.log('PASS 50 unique image assets, including associated technology and workplace imagery');

const duplicated=[{...profiles[0],id:'variant-a',imageIsPlaceholder:false,founderImage:'https://example.com/team.jpg?w=100'},{...profiles[1],id:'variant-b',imageIsPlaceholder:false,founderImage:'https://example.com/team.jpg?w=900'}];const repaired=assignUniquePortraits(duplicated);assert.notEqual(repaired['variant-a'].src.split('?')[0],repaired['variant-b'].src.split('?')[0]);console.log('PASS crop variants cannot create duplicate image assignments');
