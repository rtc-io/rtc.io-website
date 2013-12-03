// include the rtc/media module
var media = require('rtc-media');

// now capture media, and once available render to the document body
media().render(document.body);