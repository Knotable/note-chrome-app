'use strict';

window.MessageManager = (function(){
  var config = getConfig(runtime_mode);
  var exports = {};

  var sendMessageToNewTabPage = function(message){
    chrome.runtime.sendMessage(message);
  };

  var sendMessageToWebpage = function(msg){

  };


  var logout = function(){
    console.log("web client logged out, logout extension");
    asteroid.logout();
  };

  var login = function(loginToken){
    // if (localStorage.loginToken === loginToken.token) return;
    console.log("web client logged in, login extension", loginToken);

    asteroid.loginWithToken(loginToken.token).then(function(res){
      asteroid.loginSuccess(res);
      chrome.runtime.sendMessage({
        msg: 'login'
      }, $.noop);
    });
  };

  // Listen message from our knotable site
  chrome.runtime.onMessageExternal.addListener(function(message, sender, sendResponse){
    console.log("got external message", message, sender);
    if (config.domain.match(message.host)){
      switch(message.msg){
        case 'login':
        var loginToken = {
          userId: message.userId,
          token: message.token
        }
        login(loginToken);
        break;
        case 'logout':
        logout();
        break;
        default:
        // console.log("chrome.runtime.onMessageExternal EXCEPTION: unhandled message", message);
        break;
      }
    }
  });


  exports.logoutExtension = function(){
    var message = {
      msg: "logoutExtension",
      domain: config.domain
    }
    sendMessageToWebpage(message);
  };

  exports.loginExtension = function(token){
    var message = {
      msg: "loginExtension",
      domain: config.domain,
      token: token
    }
    sendMessageToWebpage(message);
  };


  exports.connected = function(){
    var message = {
      msg: "connected"
    };
    sendMessageToNewTabPage(message);
  };

  exports.disconnected = function(){
    var message = {
      msg: "disconnected"
    };
    sendMessageToNewTabPage(message);
  };

  // Listen message from content script of our knotable site.
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    // console.log("got from contentscript", message, sender);
    if (config.domain.match(message.host)){
      switch(message.msg){
        case 'getToken':
        var response;
        if (localStorage.loginToken){
          response = {
            token: localStorage.loginToken,
            host: config.domain
          };
        } else {
          response = {
            error: true,
            host: config.domain
          };
        }
        sendResponse(response);
        break;
        default:
        // console.log("chrome.runtime.onMessage EXCEPTION: unhandled message", message);
        break;
      }
    }
  });


  // listen message from new tab page.
  chrome.runtime.onMessage.addListener(function(request, sender, sendReponse) {
    if (request.method === 'MeteorDdp') {
      var args = request.args || [];
      var ddpFn = knoteServer[request.fn];
      if (!ddpFn) {
        sendReponse({
          error: 'Method not found'
        });
        return;
      }

      var callPromise = ddpFn.apply(knoteServer, request.args);
      if (!callPromise || !callPromise.then || !callPromise.fail) {
        sendReponse({
          response: callPromise || false
        });
        return;
      }
      console.info("MeteorDdp methods", arguments);
      callPromise.then(function(respArgs) {
        sendReponse({
          response: respArgs
        });
      }).fail(function(err) {
        sendReponse({
          error: err || -1
        });
      });
      return true;
    }
  });


  return exports;
})();
