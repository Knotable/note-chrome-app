'use strict';

function Knotable() {
  var _events = _.extend({}, Backbone.Events);
  var views = new KnotableViews(_events);
  views.loadTemplates();

    //endregion
  // TODO this method should be in head/avatar view
  var setUserInfoLocal = function(){

    _setUserAvatar();  // update the details if necessary
    var username = localStorageNote.getItem("username");
    var fullname = localStorageNote.getItem("fullname");
    var avatar =   localStorageNote.getItem("avatar");

    if(username !== null){
      $('#user-avatar-username').text("@" + username);
    }

    if(fullname !== null){
      $('#user-avatar-displayname').text(fullname)
    }

    if(avatar !== null && avatar === "false"){
      $('#userAvatar').addClass('knotable-user-avatar');
      var text = username[0].toUpperCase();
      $('#userAvatar').html(text);
    }

    if(avatar !== null && avatar !== "false"){

      var imgHtml = "<img style='width: 50px; height: 50px; border-radius: 50%;' src='" + avatar + "' />";
      $('#userAvatar').html(imgHtml);

      $('#userAvatar img').error( function() {
        $('#userAvatar').addClass('knotable-user-avatar');
        var text = username[0].toUpperCase();
        $('#userAvatar').html(text);
      });
    }
    if(username === null ||  fullname === null ||  avatar === null){
      _setUserAvatar();

      knoteClient.getUserInfo().then(function(contact) {

        if(_.isEmpty(contact))
        return;

        //contact = _.pairs(contact)[0][1];

        var gravatar = contact.avatar;
        var username = contact.username;
        if (gravatar && !!gravatar.path) {

          localStorageNote.setItem("avatar", gravatar.path);
          var imgHtml = "<img style='width: 50px; height: 50px; border-radius: 50%;' src='" + gravatar.path + "' />";
          $('#userAvatar').html(imgHtml);

          $('#userAvatar img').error( function() {
            $('#userAvatar').addClass('knotable-user-avatar');
            var text = username[0].toUpperCase();
            $('#userAvatar').html(text);
          });

        } else {
          localStorageNote.setItem("avatar", "false");
        }
        /* update local storage variables */
        localStorageNote.setItem("username", username);
        localStorageNote.setItem("fullname", contact.fullname);

        $('#user-avatar-username').text("@" + username);
        $('#user-avatar-displayname').text(contact.fullname)

        /* done updating */
        //$('#avatar-wrapper').attr('href', link);
      });
    }
  };
  var _setUserAvatar = function(link) {
    knoteClient.getUserInfo().then(function(contact) {

      if(_.isEmpty(contact))
      return;

      document.title = "Knotes";
      var gravatar = contact.avatar;
      var username = contact.username;
      if (gravatar && !!gravatar.path) {
        localStorageNote.setItem("avatar", gravatar.path);

      } else {
        localStorageNote.setItem("avatar", "false");
      }
      /* update local storage variables */
      localStorageNote.setItem("username", username);
      localStorageNote.setItem("fullname", contact.fullname);
      /* done updating */
    });
  };

  $(document).ready(function() {
    console.log('$document is ready');
    setTimeout(setUserInfoLocal, 3000);
  });

  return {
    createNotification: views.createNotification,
    getView: views.getView,
  };
};

window.knotable = new Knotable();
