'use strict';


chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('newtab.html', {
    'outerBounds': {
      'width': 400,
      'height': 500
    }
  });
});
