'use strict';

window.offlineMode = (function(){

	var exports = {};

	exports.isOfflineMode = false;

	exports.isNotificationShown = false;

	var _createNotification = function(options, hideAfter) {

	    options = options || {};
	    options = _.extend({
	      type: 'basic',
	      iconUrl: 'images/icon-48.png',
	      title: 'Knotable',
	      message: 'A Message'
	    }, options);
	    chrome.runtime.sendMessage({
	      method: 'createNotification',
	      options: options,
	      hideAfter: hideAfter
	    });
	};

	var _startOfflineMode = function(){

	};

	exports.notifyOffline = function(){

		if(!exports.isNotificationShown){
	       _createNotification({
	           message: 'You have gone offline'
	       }, 3000);

	       exports.isNotificationShown = true;
	       exports.isOfflineMode = true;
   		}
	};

	exports.syncOfflineKnotes = function(){

		chrome.storage.local.get('offlineEditKnotes', function (result) {
			for(var i = 0; i < result.offlineEditKnotes.length; i++){

			    knoteClient.updateKnote(result.offlineEditKnotes[i].knoteId, result.offlineEditKnotes[i].knoteId)
		        .then(function(){
		          console.log("Update knote", result.offlineEditKnotes[i].knoteId, " Success!");
		        })
		        .fail(function(){
		          console.error("Update knote", result.offlineEditKnotes[i].knoteId, " FAILED!");
		        })

		        result.offlineEditKnotes = _.reject(result.offlineEditKnotes, function(el) { return el.knoteId === result.offlineEditKnotes[i].knoteId; });

		        console.log("knotes ofline edit")
			}

			chrome.storage.local.set({'offlineEditKnotes': result.offlineEditKnotes});
		});
	};

	return exports;

})();	