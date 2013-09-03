// include the rtc-media module, if you are using the rtc module you can 
// substitute this with a rtc/media require statement
var media = require('rtc-media');

// now capture media, and once available render to the document body
media().render(document.body);