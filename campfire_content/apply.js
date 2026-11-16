// Puts Wanderer Campfire Game on the site, in one language: its block on the home page, the extensions'
// title and answer (four now), one question more on the home page, its own page; and on Wanderer Quests' page
// a section for the Gear tab. The extensions need Wanderer 0.43. Usage: node campfire_content/apply.js <slug>
// (content from campfire_content/<slug>.json). Running it again replaces what it put.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const slug = process.argv[2];
const add = JSON.parse(fs.readFileSync(path.join(__dirname, slug + '.json'), 'utf8'));
const homeFile = path.join(ROOT, 'content', slug + '.json');
const pagesFile = path.join(ROOT, 'content', 'extensions', slug + '.json');
const home = JSON.parse(fs.readFileSync(homeFile, 'utf8'));
const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));

const dashes = [0x2013, 0x2014].map((code) => String.fromCharCode(code));
if (dashes.some((dash) => JSON.stringify(add).includes(dash))) throw new Error('long dash in ' + slug);

home.campfire = add.home.campfire;
home.extensions.title = add.home.extensionsTitle;
const EXT_INDEX = 5; // "What are Wanderer's extensions?" (the same place in every language)
home.faq.items[EXT_INDEX].a = add.home.extensionsAnswer;
home.faq.items = home.faq.items.filter((item) => item.q !== add.home.faq.q);
home.faq.items.push(add.home.faq);

pages.pages.campfire = add.page;
const quests = pages.pages.quests;
quests.sections = quests.sections.filter((s) => s.id !== add.questsGear.id);
quests.sections.splice(Math.min(3, quests.sections.length), 0, add.questsGear);
// (the version every extension asks for)
pages.extensionPage.requires = pages.extensionPage.requires.replace(/0\.\d\d/, add.requiresVersion);

fs.writeFileSync(homeFile, JSON.stringify(home, null, 2) + '\n');
fs.writeFileSync(pagesFile, JSON.stringify(pages, null, 2) + '\n');
console.log('ok', slug);
