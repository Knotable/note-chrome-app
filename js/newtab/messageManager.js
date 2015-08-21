"use strict";

window.MessageManager = (function(){
  var exports = {};

  var _isFromBackground = function(senderId){
    return senderId === chrome.runtime.id;
  };

  var _onLogout = function(){
    localStorage.clear();
    // chrome.runtime.reload();
  };

  var _onLogin = function(){
    // chrome.runtime.reload();
  };

  var _onConnected = function(){
    console.log("server connected");
    offlineMode.syncOfflineKnotes();
  };

  var _onDisconnected = function(){
    console.log("Server disconnected");
    offlineMode.notifyOffline();
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
    // if (_isFromBackground(sender.id)){
      _handleMessageFromBackground(message, sender, sendResponse);
    // } else {
      // console.log("Message from where?", sender);
    // }
  });


  return exports;
})();
