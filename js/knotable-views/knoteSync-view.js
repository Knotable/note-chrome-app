var KnotesSyncView = Backbone.View.extend({
  el: '#sync-knote-container',
  events: {
    'click .sync-close': 'hide',
    'click [type="checkbox"]': 'settingChanged',
    'mouseover #setting-gmail-link': 'hoverDraftsLink',
    'mouseout #setting-gmail-link': 'hoverOutDraftsLink'
  },

  hoverDraftsLink: function(ele){
    this.$el.find('#setting-gmail-link').css('color', 'red');
  },

  hoverOutDraftsLink: function(ele){
    this.$el.find('#setting-gmail-link').css('color', '#5D95ED');
  },

  _authDropbox: function(ele){
    var enableSyncKnote = ele.currentTarget.checked
    if(enableSyncKnote){
      DropboxClient.authenticate(true)
      .then(function(){
        DropboxClient.enableSyncKnoteToDropbox(enableSyncKnote);
        console.log("Dropbox authenticate Success!");
        localStorageNote.setItem("sync-dropbox", "true");
      }).fail(function(error){
        console.error("Dropbox authenticate failed: ", error);
        localStorageNote.setItem("sync-dropbox", "false");
      });
    } else {
      DropboxClient.enableSyncKnoteToDropbox(enableSyncKnote);
    }
  },

  settingChanged: function(ele){
    if(ele.currentTarget.id === 'sync-gmail'){
      var self = this;
      setTimeout(function() {
        self.startoAuthSession();
      }, 1000);
    }
    else if(ele.currentTarget.id === 'sync-dropbox'){
      this._authDropbox(ele);
    }
    else{
      if(localStorageNote.getItem('sync-evernote')!== null && localStorageNote.getItem('sync-evernote') === "true" ){
        localStorageNote.setItem("sync-evernote", "false");
      }

      else if(localStorageNote.getItem('sync-evernote')!== null && localStorageNote.getItem('sync-evernote') === "false" ){
        localStorageNote.setItem("sync-evernote", "true");
      }

      else{
        localStorageNote.setItem("sync-evernote", "true");
      }

    }
  },

  initialize: function() {

  },
  toggleView: function() {
    this.$el.toggleClass('hidden');
  },
  render: function() {
    this.toggleView();

    this.$el.find('#setting-user').text(localStorageNote.userName);

    if(localStorageNote.getItem('sync-gmail')!== null && localStorageNote.getItem('sync-gmail') === "true" ){
      this.$el.find('#sync-gmail').attr("checked", "checked");
    }

    var self = this;
    DropboxClient.isSyncKnoteToDropbox()
    .then(function(enableSyncToDropbox){
      if(enableSyncToDropbox){
        self.$el.find('#sync-dropbox').attr("checked", "checked");
      };
    });

    if(localStorageNote.getItem('sync-evernote')!== null && localStorageNote.getItem('sync-evernote') === "true" ){
      this.$el.find('#sync-evernote').attr("checked", "checked");
    }
  },
  hide: function() {
    this.$el.addClass('hidden');
  },

  startoAuthSession: function(){

    gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: true}, function(authResult){
      if (authResult && !authResult.error) {
        // The person has authorized or is already logged in
        // pass a callback in future

        if(localStorageNote.getItem('sync-gmail')!== null && localStorageNote.getItem('sync-gmail') === "true" ){
          localStorageNote.setItem("sync-gmail", "false");
        }

        else if(localStorageNote.getItem('sync-gmail')!== null && localStorageNote.getItem('sync-gmail') === "false" ){
          localStorageNote.setItem("sync-gmail", "true");
        }

        else{
          localStorageNote.setItem("sync-gmail", "true");
        }

      } else {
        ;
        var currentWinID = 0;
        chrome.windows.onCreated.addListener(function(data){
          console.log(data)
          currentWinID = data.id;
        });

        gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: false}, function(authResult){
        });

        var pollTimer   =   window.setInterval(function() {
          try {
            gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: true}, function(authResult){
              if (authResult && !authResult.error) {
                window.clearInterval(pollTimer);
                chrome.windows.remove(currentWinID, function(){})

                setTimeout(function(){
                  // $("#btn-email-knote").click();
                  localStorageNote.setItem("sync-gmail", "true");
                }, 1000);
              }
            });
          } catch(e) {
            console.log(e)
          }
        }, 10000);

      }
    });
  }
});
