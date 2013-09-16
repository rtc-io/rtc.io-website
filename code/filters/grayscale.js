module.exports = function(imageData) {
  var channels = imageData.data;
  var channelCount = channels.length;

  // iterate through the data
  for (var ii = 0; ii < channelCount; ii += 4) {
    // update the values to the rgb average
    channels[ii] =       // update R
      channels[ii + 1] = // update G
      channels[ii + 2] = // update B
      (channels[ii] + channels[ii + 1] + channels[ii + 2] ) / 3;
  }

  // return true to flag that we want to write our pixel data
  // back to the canvas
  return true;
};