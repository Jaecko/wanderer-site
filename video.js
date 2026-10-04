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
