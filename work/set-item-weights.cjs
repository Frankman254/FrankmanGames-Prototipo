const fs = require('node:fs');
const path = 'data/rpg/items.json';
let text = fs.readFileSync(path, 'utf8');
const items = JSON.parse(text).items;
const weights = {sword:12,axe:14,mace:14,staff:10,wand:4,orb:5,dagger:5,greatsword:22,hammer:24,spear:16,bow:10,crossbow:14,shield:10,buckler:6,helmet:6,hat:2,hood:2,armor:18,robe:6,gloves:3,bracers:3,boots:5,sandals:2,ring:1,amulet:2,cape:4,belt:3,charm:2,ore:3,hide:2};
for (const [id, item] of Object.entries(items)) {
  if (item.weight !== undefined) continue;
  const prefix = `    "${id}": {`;
  if (!text.includes(prefix)) throw Error(id);
  text = text.replace(prefix, `${prefix}\n      "weight": ${weights[item.kind] ?? 1},`);
}
fs.writeFileSync(path, text);
console.log(`${Object.keys(items).length} objetos con peso explícito`);
