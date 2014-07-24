var mediaMod = require('rtc-media');
var mediaObj = mediaMod({ start: true });
var mirrorWindow = document.getElementById('mirror');
	
// Render local video
mediaObj.render(mirrorWindow);

// Flip rendered video so the user views their own
// feed as a mirror image
mirrorWindow.style.transform = 'rotateY(180deg)';