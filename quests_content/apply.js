// Puts Wanderer Quests on the site, in one language: its block on the home page, a question of the home
// FAQ, its own page; and a new section on the pages of Wanderer Auction (shopping list) and Wanderer Bags
// (selection). Usage: node quests_content/apply.js <slug>   (content from quests_content/<slug>.json)
// Run once per language; running it again replaces what it put.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const slug = process.argv[2];
const add = JSON.parse(fs.readFileSync(path.join(__dirname, slug + '.json'), 'utf8'));
const homeFile = path.join(ROOT, 'content', slug + '.json');
const pagesFile = path.join(ROOT, 'content', 'extensions', slug + '.json');
const home = JSON.parse(fs.readFileSync(homeFile, 'utf8'));
const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));

if (/[\u2013\u2014]/.test(JSON.stringify(add))) throw new Error('long dash in ' + slug);

// The home page: the block, the title of the extensions, the answer about them, one question more.
home.quests = add.home.quests;
home.extensions.title = add.home.extensionsTitle;
const EXT_INDEX = 5; // "What are Wanderer's extensions?" (the same place in every language)
home.faq.items[EXT_INDEX].a = add.home.extensionsAnswer;
home.faq.items = home.faq.items.filter((item) => item.q !== add.home.faq.q);
home.faq.items.push(add.home.faq);

// Its page, and a section more on the two others.
pages.pages.quests = add.page;
function section(page, extra) {
	page.sections = page.sections.filter((s) => s.id !== extra.id);
	page.sections.push(extra);
}
section(pages.pages.auction, add.auction.section);
section(pages.pages.bags, add.bags.section);

fs.writeFileSync(homeFile, JSON.stringify(home, null, 2) + '\n');
fs.writeFileSync(pagesFile, JSON.stringify(pages, null, 2) + '\n');
console.log('ok', slug);
