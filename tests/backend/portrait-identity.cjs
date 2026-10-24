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
