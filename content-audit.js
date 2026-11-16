// One-time content update for the audit: the definition sentence, the facts
// block, the author line, and titles / descriptions within the lengths search
// engines show (about 60 and 155 characters).
const fs = require('fs');
const L = {
	en: {
		definition: ['Wanderer is a free addon for World of Warcraft Forever.', 'Wanderer is a free immersion and comfort addon for World of Warcraft Forever.'],
		title: 'Hide names above heads in WoW Forever: the Wanderer addon',
		description: 'Wanderer, a free WoW Forever addon: hide names above heads, see who someone is on hover, quests as quiet scenes, auto sell junk.',
		facts: { heading: 'Wanderer at a glance', game: 'Game', price: 'Price', priceValue: 'Free', languages: 'Languages', languagesValue: '{count} languages', compatibility: 'Works with', updated: 'Last update', updatedValue: '{date}, version {version}', platforms: 'Download', downloads: 'Downloads', downloadsValue: '{count} on CurseForge' },
		madeBy: 'Made by {author}, on {curseforge} and {github}.',
	},
	fr: {
		definition: ['Wanderer est un addon gratuit pour World of Warcraft Forever.', "Wanderer est un addon gratuit d'immersion et de confort pour World of Warcraft Forever."],
		title: 'Cacher les noms au-dessus des têtes (WoW Forever) : Wanderer',
		description: 'Wanderer, addon gratuit pour WoW Forever : noms cachés au-dessus des têtes, étiquette de survol, quêtes en scènes, carnet de voyage, camelote vendue.',
		facts: { heading: "Wanderer en un coup d'œil", game: 'Jeu', price: 'Prix', priceValue: 'Gratuit', languages: 'Langues', languagesValue: '{count} langues', compatibility: 'Compatible avec', updated: 'Dernière mise à jour', updatedValue: '{date}, version {version}', platforms: 'Télécharger', downloads: 'Téléchargements', downloadsValue: '{count} sur CurseForge' },
		madeBy: 'Fait par {author}, sur {curseforge} et {github}.',
	},
	de: {
		definition: ['Wanderer ist ein kostenloses Addon für World of Warcraft Forever.', 'Wanderer ist ein kostenloses Addon für Immersion und Komfort in World of Warcraft Forever.'],
		title: 'Namen über den Köpfen ausblenden in WoW Forever: Wanderer',
		description: 'Wanderer, kostenloses Addon für WoW Forever: Namen über den Köpfen ausblenden, Mouseover-Schildchen, Quests als Szenen, Reisetagebuch, Plunder verkaufen.',
		facts: { heading: 'Wanderer auf einen Blick', game: 'Spiel', price: 'Preis', priceValue: 'Kostenlos', languages: 'Sprachen', languagesValue: '{count} Sprachen', compatibility: 'Funktioniert mit', updated: 'Letztes Update', updatedValue: '{date}, Version {version}', platforms: 'Herunterladen', downloads: 'Downloads', downloadsValue: '{count} auf CurseForge' },
		madeBy: 'Gemacht von {author}, auf {curseforge} und {github}.',
	},
	es: {
		definition: ['Wanderer es un addon gratuito para World of Warcraft Forever.', 'Wanderer es un addon gratuito de inmersión y comodidad para World of Warcraft Forever.'],
		title: 'Ocultar nombres sobre las cabezas en WoW Forever: Wanderer',
		description: 'Wanderer, addon gratuito para WoW Forever: oculta los nombres sobre las cabezas, etiqueta al pasar el ratón, misiones en escenas, diario de viaje.',
		facts: { heading: 'Wanderer de un vistazo', game: 'Juego', price: 'Precio', priceValue: 'Gratis', languages: 'Idiomas', languagesValue: '{count} idiomas', compatibility: 'Compatible con', updated: 'Última actualización', updatedValue: '{date}, versión {version}', platforms: 'Descargar', downloads: 'Descargas', downloadsValue: '{count} en CurseForge' },
		madeBy: 'Hecho por {author}, en {curseforge} y {github}.',
	},
	it: {
		definition: ['Wanderer è un addon gratuito per World of Warcraft Forever.', 'Wanderer è un addon gratuito di immersione e comodità per World of Warcraft Forever.'],
		title: null,
		description: null,
		facts: { heading: "Wanderer in un colpo d'occhio", game: 'Gioco', price: 'Prezzo', priceValue: 'Gratuito', languages: 'Lingue', languagesValue: '{count} lingue', compatibility: 'Compatibile con', updated: 'Ultimo aggiornamento', updatedValue: '{date}, versione {version}', platforms: 'Scarica', downloads: 'Download', downloadsValue: '{count} su CurseForge' },
		madeBy: 'Creato da {author}, su {curseforge} e {github}.',
	},
	'pt-br': {
		definition: ['Wanderer é um addon gratuito para World of Warcraft Forever.', 'Wanderer é um addon gratuito de imersão e conforto para World of Warcraft Forever.'],
		title: null,
		description: 'Wanderer, addon gratuito para WoW Forever: esconde os nomes acima das cabeças, etiqueta ao passar o mouse, missões em cenas, diário de viagem.',
		facts: { heading: 'Wanderer num relance', game: 'Jogo', price: 'Preço', priceValue: 'Gratuito', languages: 'Idiomas', languagesValue: '{count} idiomas', compatibility: 'Compatível com', updated: 'Última atualização', updatedValue: '{date}, versão {version}', platforms: 'Baixar', downloads: 'Downloads', downloadsValue: '{count} no CurseForge' },
		madeBy: 'Feito por {author}, no {curseforge} e no {github}.',
	},
	ru: {
		definition: ['Wanderer: бесплатный аддон для World of Warcraft Forever.', 'Wanderer: бесплатный аддон для погружения и удобства в World of Warcraft Forever.'],
		title: null,
		description: null,
		facts: { heading: 'Wanderer коротко', game: 'Игра', price: 'Цена', priceValue: 'Бесплатно', languages: 'Языки', languagesValue: '{count} языков', compatibility: 'Совместим с', updated: 'Последнее обновление', updatedValue: '{date}, версия {version}', platforms: 'Скачать', downloads: 'Загрузки', downloadsValue: '{count} на CurseForge' },
		madeBy: 'Автор: {author}, на {curseforge} и {github}.',
	},
	ko: {
		definition: ['Wanderer는 World of Warcraft Forever용 무료 애드온입니다.', 'Wanderer는 World of Warcraft Forever를 위한 무료 몰입 및 편의 애드온입니다.'],
		title: null,
		description: null,
		facts: { heading: '한눈에 보는 Wanderer', game: '게임', price: '가격', priceValue: '무료', languages: '언어', languagesValue: '{count}개 언어', compatibility: '함께 쓰는 애드온', updated: '최근 업데이트', updatedValue: '{date}, 버전 {version}', platforms: '다운로드', downloads: '다운로드 수', downloadsValue: 'CurseForge에서 {count}회' },
		madeBy: '{author} 제작, {curseforge} 및 {github}.',
	},
	'zh-cn': {
		definition: ['Wanderer 是一款适用于 World of Warcraft Forever 的免费插件。', 'Wanderer 是一款适用于 World of Warcraft Forever 的免费沉浸与便利插件。'],
		title: null,
		description: null,
		facts: { heading: 'Wanderer 一览', game: '游戏', price: '价格', priceValue: '免费', languages: '语言', languagesValue: '{count} 种语言', compatibility: '兼容', updated: '最近更新', updatedValue: '{date}，版本 {version}', platforms: '下载', downloads: '下载次数', downloadsValue: 'CurseForge 上 {count} 次' },
		madeBy: '由 {author} 制作，见 {curseforge} 与 {github}。',
	},
	'zh-tw': {
		definition: ['Wanderer 是一款適用於 World of Warcraft Forever 的免費插件。', 'Wanderer 是一款適用於 World of Warcraft Forever 的免費沉浸與便利插件。'],
		title: null,
		description: null,
		facts: { heading: 'Wanderer 一覽', game: '遊戲', price: '價格', priceValue: '免費', languages: '語言', languagesValue: '{count} 種語言', compatibility: '相容', updated: '最近更新', updatedValue: '{date}，版本 {version}', platforms: '下載', downloads: '下載次數', downloadsValue: 'CurseForge 上 {count} 次' },
		madeBy: '由 {author} 製作，見 {curseforge} 與 {github}。',
	},
};
for (const [slug, v] of Object.entries(L)) {
	const file = 'content/' + slug + '.json';
	const c = JSON.parse(fs.readFileSync(file, 'utf8'));
	if (c.hero.lead.startsWith(v.definition[0])) c.hero.lead = v.definition[1] + c.hero.lead.slice(v.definition[0].length);
	else if (!c.hero.lead.startsWith(v.definition[1])) throw new Error(slug + ': first sentence changed');
	if (v.title) c.meta.title = v.title;
	if (v.description) c.meta.description = v.description;
	c.facts = v.facts;
	c.footer.madeBy = v.madeBy;
	if (c.meta.title.length > 60) throw new Error(slug + ': title ' + c.meta.title.length);
	if (c.meta.description.length > 155) throw new Error(slug + ': description ' + c.meta.description.length);
	fs.writeFileSync(file, JSON.stringify(c, null, 2) + '\n');
	console.log(slug, 'title', c.meta.title.length, 'description', c.meta.description.length);
}
