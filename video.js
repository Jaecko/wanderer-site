// The trailer loads only when asked: until then, a picture and a link to YouTube.
document.querySelectorAll('.video-facade').forEach(function (facade) {
	facade.addEventListener('click', function (event) {
		event.preventDefault();
		var frame = document.createElement('iframe');
		frame.src = 'https://www.youtube-nocookie.com/embed/' + facade.dataset.video + '?autoplay=1&rel=0';
		frame.title = facade.dataset.title;
		frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
		frame.allowFullscreen = true;
		facade.replaceWith(frame);
		frame.focus();
	});
});

// Sections rise softly into view as you scroll (shown at once without this script).
(function () {
	var items = document.querySelectorAll('.reveal');
	if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
		items.forEach(function (el) { el.classList.add('is-visible'); });
		return;
	}
	var seen = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) {
				entry.target.classList.add('is-visible');
				seen.unobserve(entry.target);
			}
		});
	}, { rootMargin: '0px 0px -8% 0px' });
	items.forEach(function (el) { seen.observe(el); });
})();

// The language menu closes when you click elsewhere.
document.addEventListener('click', function (event) {
	document.querySelectorAll('.langmenu[open]').forEach(function (menu) {
		if (!menu.contains(event.target)) menu.removeAttribute('open');
	});
});
