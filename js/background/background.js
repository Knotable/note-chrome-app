'use strict';

/*
* Check for valid session every 5 minues
*/
var iconStates = {
  loggedIn: 'loggedIn',
  loggedOut: 'loggedOut'
};


var iconImage = {
  loggedIn: 'images/Knotable-logo.png',
  loggedOut: 'images/Knotable-logo-disable.png'
};


var updateIcon = function(stat) {
  var iconPath = iconImage[stat];

  if (window.knoteServer) {
    chrome.runtime.sendMessage({
      method: 'reload'
    }, function() {});
    chrome.runtime.sendMessage({
      method: 'collapseView'
    }, function() {});

    chrome.runtime.sendMessage({
      method: 'addToKnotable'
    }, function() {});
  }
};


window.knoteServer = new KnotableMeteor();


var notificationsCallbacks = {};
chrome.notifications.onClicked.addListener(function(id) {
  var url = notificationsCallbacks[id];
  console.debug(url);
  if (url) {
    chrome.tabs.create({
      url: url
    });
  }
  notificationsCallbacks[id] = undefined;
});
var notificationsTimers = {};
window.createNotification = function(request) {
  chrome.notifications.getAll(function(notifications) {
    var url = request.options.openURL;
    delete request.options.openURL;

    notifications = notifications || {};
    var ids = Object.keys(notifications);
    var notificationId = 'knote-' + (Math.random());
    if (ids.length) {
      notificationId = ids[0];
      chrome.notifications.clear(notificationId, function() {});
    }
    if (notificationsTimers[notificationId]) clearTimeout(notificationsTimers[notificationId]);
    delete notificationsTimers[notificationId];
    var notification = chrome.notifications.create(notificationId, request.options, function(id) {
      notificationsCallbacks[id] = url;
      if (request.hideAfter) {
        notificationsTimers[id] = setTimeout(function() {
          chrome.notifications.clear(id, function() {});
        }, request.hideAfter);
      }
    });
  });

}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.method === 'createNotification') {
    window.createNotification(request);
  }
});


/*
Logger listener for content script
*/

var browserActionBlackList = [
  /chrome.*?/,
  /(http|https):\/\/chrome.google.com\/webstore.*?/,
  /https:\/\/(www\.)?mail.google\.com/i
];


/*
* For pages that does not support the ext, we show the popup instead of taking a screenshot
*/


var onActiveTabChange = function() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    if (tabs.length < 1) {
      return;
    }
    var tab = tabs[0];

    if (tab.url.lastIndexOf("chrome-devtools:") != -1) {
      console.log("Devtools opend........")

      return;
    }


    var validUrl = true;
    for (var i = 0; i < browserActionBlackList.length; i++) {
      validUrl &= !tab.url.match(browserActionBlackList[i]);
      if (!validUrl) {
        break;
      }
    }


  });
};

/* Events For when the app is installed or updated */
chrome.runtime.onInstalled.addListener(function (details){
  //Reason can be any => "install", "update", "chrome_update", or "shared_module_update"
  //For now we are more interested in install and update

  if(details.reason === 'install' || details.reason === 'update'){
    localStorage.setItem("isIntroSeen", "false");
  }
});
/* On install events end here */
