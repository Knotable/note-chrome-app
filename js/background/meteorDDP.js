'use strict';

var KnotableMeteor = function() {
  /*
  * Set K icon to inactive by default
  */
  updateIcon(iconStates.loggedOut);

  var exports = {};
  var config = getConfig(runtime_mode);

  exports.getTopicId = function(){
    return asteroid.getTopicId();
  };

  exports.hasLoggedIn = function(){
    return asteroid.hasLoggedIn();
  };

  exports.logout = function() {
    return asteroid.logout();
  };

  exports.addKnote = function(data) {
    var requiredKnoteParams = {
      subject: data.subject || '',
      from: data.from || AccountHelper.getEmail(),
      to: data.to,
      body: data.htmlBody,
      htmlBody: data.htmlBody,
      name: AccountHelper.getUsername(),
      topic_id: data.topic_id || this.getTopicId(),
      userId: AccountHelper.getUserId(),
      date: data.date || new Date().toGMTString(),
      isMailgun: false,
      timestamp: Date.now()
    };
    var optionalKnoteParams = {
      order: data.order,
      title: data.title
    };
    exports.apply('updateNewTabTopicPosition', [data.topic_id, 300, 'ext:KnotableMeteor.addKnote']);
    return exports.call("add_knote", requiredKnoteParams, optionalKnoteParams);
  };


  exports.updateKnote = function(knoteId, options){
    console.log("MeteorDDP updateKnote", knoteId, options);
    return asteroid.updateKnote(knoteId, options);
  };


  exports.removeKnote = function(knoteId){
    console.log("MeteorDDP removeKnote", knoteId);
    return asteroid.removeKnote(knoteId);
  };


  exports.call = function(method, args) {
    return asteroid.call.apply(asteroid, arguments).result;
  };


  exports.apply = function(method, args) {
    return asteroid.apply(method, args).result;
  };


  exports.createAccount = function(options){
    return asteroid.createUser(options);
  };


  exports.loginWithPassword = function (usernameOrEmail, password){
    return asteroid.loginWithPassword(usernameOrEmail, password);
  };


  exports.getCollection = function(pubName, params) {
    return asteroid.getCollection(pubName).reactiveQuery({}).result;
  };


  exports.getUserInfo = function() {
    if(asteroid.loggedIn){
      return AccountHelper.getContact();
    } else {
      return null;
    }
  };


  asteroid.init(config.server);
  return exports;

};
//Meteor Connectione ends here
