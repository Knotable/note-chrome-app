"use strict";

window.MessageManager = (function(){
  var exports = {};

  var _isFromBackground = function(senderId){
    return senderId === chrome.runtime.id;
  };

  var _onLogout = function(){
    setTimeout(function(){
      // wait for loading user avatar
      // TODO make it notification
      window._knotesView.headerView.render();
    }, 1000);
  };

  var _onLogin = function(){
    console.log("user logged in render header view");
    setTimeout(function(){
      // wait for loading user avatar
      // TODO make it notification
      window._knotesView.headerView.render();
    }, 1000);

  };

  var _onConnected = function(){
    console.log("server connected");
    offlineMode.syncOfflineKnotes();
    offlineMode.syncCreateKnotes();
    offlineMode.isOfflineMode = false;
  };

  var _onDisconnected = function(){
    console.log("Server disconnected");
    offlineMode.notifyOffline();
    offlineMode.isOfflineMode = true;
  };

  var _handleMessageFromBackground = function(message, sender, sendResponse){
    // console.info("Message from background", message);
    switch(message.msg){
      case 'logout':
      _onLogout();
      break;
      case "login":
      _onLogin();
      break;
      case "connected":
      _onConnected();
      break;
      case "disconnected":
      _onDisconnected();
      break;
      default:
      break;
    };
  };


  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    _handleMessageFromBackground(message, sender, sendResponse);
  });


  return exports;
})();
