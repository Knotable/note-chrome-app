/**
*
* Dropbox API
* http://coffeedoc.info/github/dropbox/dropbox-js/master/classes/Dropbox.html
*
*/


window.DropboxClient = (function(){

  var exports = {};
  var _key = "novxqjavar7gg72";
  var _noteInstantlyPath = "/Note Instantly";
  var _dropbox = new Dropbox.Client({ key: _key });

  _dropbox.authDriver(new Dropbox.AuthDriver.ChromeExtension({
    receiverPath: "views/dropbox_receiver.html"}));

    _dropbox.onError.addListener(function(error) {
      if (window.console) {  // Skip the "if" in node.js code.
      console.error("Dropbox ERROR:", error);
    }
  });


  var _showError = function(error) {
    switch (error.status) {
      case Dropbox.ApiError.INVALID_TOKEN:
      // If you're using _dropbox.js, the only cause behind this error is that
      // the user token expired.
      // Get the user through the authentication flow again.
      break;

      case Dropbox.ApiError.NOT_FOUND:
      // The file or folder you tried to access is not in the user's Dropbox.
      // Handling this error is specific to your application.
      break;

      case Dropbox.ApiError.OVER_QUOTA:
      // The user is over their Dropbox quota.
      // Tell them their Dropbox is full. Refreshing the page won't help.
      break;

      case Dropbox.ApiError.RATE_LIMITED:
      // Too many API requests. Tell the user to try again later.
      // Long-term, optimize your code to use fewer API calls.
      break;

      case Dropbox.ApiError.NETWORK_ERROR:
      // An error occurred at the XMLHttpRequest layer.
      // Most likely, the user's network connection is down.
      // API calls will not succeed until the user gets back online.
      break;

      case Dropbox.ApiError.INVALID_PARAM:
      case Dropbox.ApiError.OAUTH_ERROR:
      case Dropbox.ApiError.INVALID_METHOD:
      default:
      // Caused by a bug in _dropbox.js, in your application, or in Dropbox.
      // Tell the user an error occurred, ask them to refresh the page.
    }
  };


  var _createNoteFolder = function(){
    if(_dropbox.isAuthenticated()){
      _dropbox.readdir("/", function(error, entries, stat, entriesStats) {
        if (error) {
          return _showError(error);  // Something went wrong.
        }
        var folderExist = false;
        _.each(entries, function(entry, index){
          if (entriesStats[index].isFolder && entry === 'Note Instantly'){
            folderExist = true;
          }
        });

        if (!folderExist){
          _dropbox.mkdir(_noteInstantlyPath, function(error, stats){
            if (error){
              console.log("Create Note Instantly in your dropbox failed", stats);
            } else {
              console.log("Create Note Instantly in your dropbox success", stats);
            }
          });
        } else {
          console.log("Create Note Instantly in your dropbox stopped. folder exist!");
        }
      });
    }
  };

  var _timeInFilename = function(createdTime){
    return moment(createdTime).format(', MM-DD-GGGG h:mm:ss.SSS A');
  };

  var _getCreateTimeFromKnote = function(knote){
    var date = knote.created_time;
    if(_.isObject(date) && date.$date){
      date = date.$date;
    }
    return date;
  };

  var _getfilenameInDropbox = function(knote){
    var created_time = _getCreateTimeFromKnote(knote);
    return _timeInFilename(created_time);
  };

  /**
   * authenticate user's dropbox
   * @param  {Boolean} interactive [true: in settings page, false, in other calls]
   * @return {promise}             [description]
   */
  exports.authenticate = function(interactive){
    var deferred = new $.Deferred();
    if(_dropbox.isAuthenticated()){
      _createNoteFolder();
      deferred.resolve();
    } else {
      _dropbox.authenticate({interactive: interactive}, function(error, dropbox) {
        if (error) {
          _showError(error);
          deferred.reject(error);
        } else {
          // TODO save credentials to server.
          // console.log("credentials", _dropbox.credentials());
          _createNoteFolder();
          deferred.resolve();
        }
      });
    }
    return deferred.promise();
  };

  exports.enableSyncKnoteToDropbox = function(enableSyncKnote){
    chrome.storage.sync.set({'syncKnoteToDropbox': enableSyncKnote});
  };

  exports.isSyncKnoteToDropbox = function(){
    var deferred = new $.Deferred();
    chrome.storage.sync.get('syncKnoteToDropbox', function(data){
      if (chrome.runtime.lastError){
        deferred.reject(chrome.runtime.lastError);
      } else {
        deferred.resolve(data.syncKnoteToDropbox);
      }
    });
    return deferred.promise();
  };

  exports.removeKnote = function(knote){
    var deferred = new $.Deferred();
    if(_dropbox.isAuthenticated()){
      var filenameInDropbox = _getfilenameInDropbox(knote);

      _dropbox.findByName(_noteInstantlyPath, filenameInDropbox, function(error, stat){
        if (error) {
          _showError(error);
          deferred.reject(error);
        } else {
          if (_.isEmpty(stat)){
            deferred.resolve();
          } else {
            _dropbox.remove(stat[0].path, function(error, stat) {
              if (error) {
                _showError(error);
                deferred.reject(error);
              } else {
                deferred.resolve(stat);
              }
            });
          }
        }
      });
    } else {
      deferred.resolve();
    }
    return deferred.promise();
  };


  exports.syncKnote = function(knote){
    var deferred = new $.Deferred();

    if(_dropbox.isAuthenticated() && knote._id){
      var filenameInDropbox = _getfilenameInDropbox(knote);
      _dropbox.findByName(_noteInstantlyPath, filenameInDropbox, function(error, stats){
        if (error) {
          _showError(error);
          deferred.reject(error);
        } else {
          var pathname = '';
          var newPath = '';
          var path = '';
          var prefix = knote.title || knote.content;
          pathname =  prefix.slice(0, 50) + filenameInDropbox + '.txt';
          newPath = _noteInstantlyPath + '/' + pathname;
          if (!_.isEmpty(stats) && stats.length === 1){
            path = stats[0].path;
          } else {
            path = newPath;
          }
          _dropbox.writeFile(path, knote.content, function(error, stat) {
            if (error) {
              _showError(error);
              deferred.reject(error);
            } else {
              if(newPath !== path){
                _dropbox.move(stat.path, newPath, function(error, stat){
                  if (error){
                    _showError(error);
                    deferred.reject(error);
                  } else {
                    deferred.resolve(stat);
                  }
                });
              } else {
                deferred.resolve(stat);
              }
            }
          });
        }
      });
    } else {
      deferred.resolve();
    }

    return deferred.promise();
  };

  return exports;
})();


window.DropboxClient.isSyncKnoteToDropbox()
.then(function(enableSyncToDropbox){
  if(enableSyncToDropbox){
    DropboxClient.authenticate(false).then(function(){
      console.info("Dropbox authenticate success!");
    }).fail(function(){
      console.error("Dropbox authenticate failed! Please re-enable dropbox in settings.");
    });
  }
});
