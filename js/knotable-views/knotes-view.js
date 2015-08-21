var KnotesView = Backbone.View.extend({
  el: '#knotes-container',
  events: {
    'click #btn-add-knote': 'saveCurrentKnote',
    'click #btn-add-knote-plus': 'createKnote',
    'click #btn-email-knote': 'emailKnote',
    'click #btn-delete-knote': 'deleteKnote',
    'focus #knote-edit-area': 'ensureLoggingIn',
    'keyup #knote-edit-area': 'updateKnoteText',
    "click .new-knote": "newKnote",
    'focusout #knote-edit-area': 'updateKnoteOutFocus'
  },
  saveCurrentKnote: function(){
    this._updateKnoteOnActiveKnote();
  },
  updateKnoteOutFocus: function(){
    this._updateKnoteOnActiveKnote();
  },
  _updateKnoteOnActiveKnote: function(){
    if(this.activeKnote){
      this._updateKnote();
    }
  },
  newKnote: function(){
    this.$el.find('textarea').val('').focus();
    this.$el.find(".list-knote.active").removeClass("active");
    this.$el.find(".new-knote").addClass("active");
    this.activeKnote = null;
  },
  ensureLoggingIn: function() {
    var self = this;
    knoteClient.hasLoggedIn().then(function(loggedIn){
      if(loggedIn){
        if($("#knotable-button-login").length !== 0)
          new self.LoginView().hide();
      } else {
        if($("#knotable-button-login").length === 0)
          new self.LoginView().show();
      }
    }).fail(function(){
      if($("#knotable-button-login").length === 0)
        new self.LoginView().show();
    });
  },
  emailKnote: function() {
    var self = this;
    gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: true}, function(authResult){
      if (authResult && !authResult.error) {
        // The person has authorized or is already logged in
        var knote = self.activeKnote;
        console.debug('should email:', knote);
        self.emailView = self.emailView || new EmailView({contact: self.contact});
        self.emailView.model = knote;
        self.emailView.render();

      } else {

        setTimeout(function(){

          var currentWinID = 0;
          chrome.windows.onCreated.addListener(function(data){
            console.log(data)
            currentWinID = data.id;
          })

          gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: false}, function(authResult){
          });

          var pollTimer   =   window.setInterval(function() {
            try {
              gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: true}, function(authResult){
                if (authResult && !authResult.error) {
                  window.clearInterval(pollTimer);
                  chrome.windows.remove(currentWinID, function(){})

                  setTimeout(function(){
                    $("#btn-email-knote").click();
                  }, 1000);
                }
              });
            } catch(e) {
              console.log(e)
            }
          }, 5000);

        }, 1500);

      }
    });

  },
  createKnote: function(content) {
    if(navigator.onLine === false || offlineMode.isOfflineMode){
      return;
    }

    if(this.activeKnote){
      this.$el.find("#knote-edit-area").val('').focus();
      this.$el.find(".list-knote.active").removeClass("active");
      this.tmpl = _.template($('#new-knote-template').html());
      this.$el.find("#knotes-list").prepend(this.tmpl);

      this._updateKnote();
      this.activeKnote = null;
      return null;
    }

    if (!(content && _.isString(content))) {
      content = this._getEditAreaContent();
    }

    if(_.isEmpty(content)){
      return null;
    }

    var nextOrder = _.max(this.collection.pluck('order'));
    if (!isFinite(nextOrder)) nextOrder = 1;
    var newKnote = new KnoteModel({
      order: nextOrder + 0.1,
      content: content,
      topicId: localStorage.topicId
    });
    newKnote.save();
    this.collection.add(newKnote);
    this.setActiveKnote(newKnote);

    var $newKnote = this.$el.find(".list-knote.new-knote")
    $newKnote.addClass("hide").removeClass("active").find("strong").text('');

    googleAnalyticsHelper.trackAnalyticsEvent('knote', 'created');

  },
  deleteKnote: function() {
    var self = this;
    var knote = self.activeKnote;
    if (knote) {
      var knoteId = self.activeKnote.get('knoteId');
      console.log("delete Knote", knoteId);
      knoteClient.removeKnote(knoteId)
      .then(function(){
        DropboxClient.removeKnote(knote);
        self.collection.remove(knote);
        console.log("long", self.$el.find("#knotes-list li").first());
        self.$el.find("#knotes-list li").first().next().trigger("click");
      }).fail(function(error){
        console.log("long removeKnote", error);
      });
    }
    else{
      self.$el.find("#knotes-list li").first().next().trigger("click");
    }

    setTimeout(function(){
      if(self.$("#knotes-list").has('li').length === 0){
        $("#knote-edit-area").val("");
        self.createKnote();
      }
    }, 200);

  },
  initialize: function(knotesCollection) {
    var self = this;

    this.LoginView = window.knotable.getView('LoginView');
    this.collection = knotesCollection;

    this.collection.on('add', this.onKnoteAdded, this);
    this.collection.on('remove', this.onKnoteRemoved, this);
    // this.collection.on('change', this.onKnoteChanged, this);
    this.collection.on('timeStampUpdate', this.onTimeStampUpdated, this);

    this.searchView = new SearchBoxView();
    var self = this;
    this.$el.find('#knotes-list').sortable({
      containment: 'parent',
      items: 'li.list-group-item',
      update: function(evt, ui) {
        return;
        var newIndex = ui.item.index();
        // swap the order
        var aModel = self.collection.models[self.initialIndex],
        bModel = self.collection.models[newIndex],
        aOrder = aModel.get('order'),
        bOrder = bModel.get('order');
        aModel.update({
          order: bOrder,
          event: 'updateOrder'
        });
        bModel.update({
          order: aOrder,
          event: 'updateOrder'
        });

        self.initialIndex = null;
      },
      start: function(evt, ui) {
        self.initialIndex = ui.item.index();
      }
    });
  },
  render: function() {
    this._syncGmailDraftsService();
    this._syncServerKnotes();

    $(".list-knote").each(function(){
      if($(this).attr("data-knoteid") === ""){
        $(this).remove();
      }
    });
    this.$el.find("#knote-edit-area").focus();
    $("#knotes-list li:nth-child(1)").click();

    return this;
  },

  _clearOfflineKnotes: function(){
    chrome.storage.local.set({'offlineEditKnotes': []});
  },

  _updateKnoteOffline: function(){
       var self = this;
       self.offlineEditKnotes = []
       var knoteId = self.activeKnote.get("_id") || self.activeKnote.get("knoteId");
       chrome.storage.local.get('offlineEditKnotes', function (result) {
         if(!_.isEmpty(result)){
           self.offlineEditKnotes = result.offlineEditKnotes;
         }
         var matchedKnotes = _.findWhere(self.offlineEditKnotes, {'knoteID':knoteId});

         if (matchedKnotes) {
           matchedKnotes.updateOptions = self._getUpdateOptions();
         }

        else{
           var offlineKnote = {
             knoteID: knoteId,
             updateOptions: self._getUpdateOptions()
           };

           self.offlineEditKnotes.push(offlineKnote);
        }
        chrome.storage.local.set({'offlineEditKnotes': self.offlineEditKnotes});

       });
  },

  updateKnoteText: _.throttle(function(e) {
    var textarea = $(e.currentTarget);
    var val = textarea.val().trim();
    var self = this;

    if(navigator.onLine === false || offlineMode.isOfflineMode){
      this._updateKnoteOffline();
    }

    if (!this.activeKnote)
    {
      if(!_.isEmpty(val)){
        this.createKnote(val);
      }
    } else {
      this.activeKnote.set({
        'content': val || 'new',
        'updated_date': new Date(),
        event: e.type
      });
      this._updateKnote();
      this.activeKnote.trigger('activate', true);
    }
  }, 2000),

  _getUpdateOptions: function(){
    var data = {};
    var content = $('#knote-edit-area').val().trim();
    var contentArray = _.compact(content.split('\n'));
    var body, title;
    if (contentArray.length  > 1){
      title = contentArray[0];
      body = content.slice(title.length).trim();
    } else {
      title = content;
      body = '';
    }
    data.title = title;
    data.htmlBody = body;
    return data;
  },

  _showSyncLoader: function(){
    $("#knote-sync-message").css("visibility", "block").fadeIn("slow");
  },

  _hideSyncLoader: function(){
    $("#knote-sync-message").css("visibility", "hidden").fadeIn("slow");
  },

  _updateKnote: function(){
    var options = this._getUpdateOptions();
    var knoteId = this.activeKnote.get("_id") || this.activeKnote.get("knoteId");
    console.log("update knote", options, knoteId, this.activeKnote);
    var knoteHasChanged = true;
    if (options.title === this.activeKnote.get("title") && options.htmlBody === this.activeKnote.get("htmlBody")){
      knoteHasChanged = false;
    }
    if(knoteId && knoteHasChanged){
      this._showSyncLoader();
      knoteClient.updateKnote(knoteId, options)
      .then(function(){
        console.log("Update knote", knoteId, " Success!");
        window._knotesView._hideSyncLoader();
      })
      .fail(function(){
        console.error("Update knote", knoteId, " FAILED!");
        window._knotesView._hideSyncLoader();
      })
    }
  },

  onKnoteAdded: function(model) {
    var self = this;
    var date = new Date(model.get("updated_date"));

    if ( model.get('archived') )
    return this;

    var self = this,
    knoteView = new KnoteView(model);

    knoteView = knoteView.render().$el;
    this.$el.find('#knotes-list').prepend(knoteView);

    return this;
  },
  onKnoteRemoved: function(knote, collection, idx) {
    var self = this;
    knote.trigger('destroy');
    this.setActiveKnote.bind(this, this.collection.models[idx.index - 1]);

  },
  onKnoteChanged: function(knote, collection, idx) {
    // knote.set('body', '<div>' + knote.get('content').replace(/\n/g, '<br />') + '</div>');
    var self = this;
    var knoteID = knote.get("_id") || knote.get("knoteId");

    var updateData = {
      topic_id: localStorage.topicId
    };

    console.log("on knote changed", knoteID, knote.attributes);
    if(knoteID === ""){
      var promise = knote.update(updateData);

      if(promise !== null){

        promise.then(function() {
          delete knote['isUpdating'];
          console.log("success")
        }).fail(function(){
        }).done(function(){
        });

      }
    }
    else{
      if(!knoteID) return;

      var draft = {
        "knoteId": knoteID,
        "content": '<div>' + knote.get('content').replace(/\n/g, '<br />') + '</div>'
      };

      this.saveKnoteAsServerDraft(draft);
    }
    window.chromeActiveKnote = knoteID;
    window.chromeActiveKnoteContent = $("#knote-edit-area").val();
    var trottle = _.throttle(self.saveKnoteAsGmailDraft, 2000);
    trottle();
  },
  _isEditableAreaEmpty: function(){
    return _.isEmpty(this._getEditAreaContent());
  },
  _getEditAreaContent: function(){
    return this.$el.find("#knote-edit-area").val().trim();
  },
  _removeKnoteIfEmptyContent: function(){
    var self = this;
    if (self.activeKnote && self._isEditableAreaEmpty()){
      var knoteId = self.activeKnote.get("_id") || self.activeKnote.get("knoteId");
      var knoteCid = self.activeKnote.cid;

      var knote = self.activeKnote.toJSON();
      console.log("remove knote Id is", knoteId);

      if (knoteId){
        knoteClient.removeKnote(knoteId)
        .then(function(){
          DropboxClient.removeKnote(knote);
          self.collection.remove(knoteCid);
        }).fail(function(error){
          console.log("long removeKnote", error);
        });
      }
    }
  },
  setActiveKnote: function(id) {
    var activeKnote;
    if (id instanceof(KnoteModel)) {
      activeKnote = id;
    } else {
      activeKnote = this.collection.findWhere({
        knoteId: id
      });
    }
    if (!activeKnote) return;
    this._removeKnoteIfEmptyContent();

    this.activeKnote = activeKnote;
    this.$el.find(".new-knote.active").removeClass("active").addClass("hide");
    this.$el.find('textarea').val(activeKnote.get('content')).focus();

    var self = this;
    this.collection.each(function(model, collection) {
      model.trigger('activate', model === activeKnote);
    });

    this.$el.find('#btn-email-knote,#btn-delete-knote').removeAttr('disabled');
    return this.activeKnote;
  },
  saveKnoteAsGmailDraft: function(){
    var self = this;
    var gmailDrafts = [];

    if(localStorage.getItem('gmailDrafts') !== null){
      gmailDrafts = JSON.parse(localStorage.getItem('gmailDrafts'))
    }
    else{
      // do nothing for now
    }

    var currentKnote = {
      knoteID: chromeActiveKnote,
      lastEdited: moment().format(),
      knoteContent: chromeActiveKnoteContent
    };

    var matchedDraft = _.findWhere(gmailDrafts, {'knoteID':currentKnote.knoteID});
    if (matchedDraft) {
      matchedDraft.knoteContent = chromeActiveKnoteContent;
    }
    else{
      gmailDrafts.push(currentKnote);
    }

    localStorage.setItem('gmailDrafts', JSON.stringify(gmailDrafts));
  },

  saveKnoteAsServerDraft: function(knoteData){

    var self = this;
    var knoteDrafts = [];

    if(localStorage.getItem('knoteDrafts') !== null){
      knoteDrafts = JSON.parse(localStorage.getItem('knoteDrafts'))
    }

    else{
      // do nothing for now
    }

    var matchedDraft = _.findWhere(knoteDrafts, {'knoteId':knoteData.knoteId});

    if (matchedDraft) {
      matchedDraft.content = knoteData.content;
    }
    else{
      knoteDrafts.push(knoteData);
    }

    localStorage.setItem('knoteDrafts', JSON.stringify(knoteDrafts));
  },

  _syncGmailDraftsService: function(){

    setInterval(function(){

      if(!KneSyncHelper.isGmailSyncSetting()){
        // console.log("Sync Gmail not allowed")
        return;
      }
      var gmailDrafts = [];
      var knotesDraftsMap = JSON.parse(localStorage.getItem('draft-knote-map'));

      if(localStorage.getItem('gmailDrafts') !== null ){
        gmailDrafts = JSON.parse(localStorage.getItem('gmailDrafts'));

        if(gmailDrafts.length > 0){
          var matchedDraft = _.findWhere(knotesDraftsMap, {'knoteID':gmailDrafts[0].knoteID});
          if (matchedDraft) {
            KneSyncHelper.updateDraftFromID(matchedDraft.draftID, gmailDrafts[0].knoteContent, "");
          }
          else{
            KneSyncHelper.syncGmailDrafts("", gmailDrafts[0].knoteContent, gmailDrafts[0].knoteID);
          }

          gmailDrafts = _.reject(gmailDrafts, function(el) { return el.knoteID === gmailDrafts[0].knoteID; });
        }

        localStorage.setItem('gmailDrafts', JSON.stringify(gmailDrafts));
      }

    }, 60000);

  },

  _syncServerKnotes: function(){

    setInterval(function(){

      var knoteDrafts = [];

      if(localStorage.getItem('knoteDrafts') !== null ){
        // console.log("sync started");
        knoteDrafts = JSON.parse(localStorage.getItem('knoteDrafts'));

        if(knoteDrafts.length > 0){

          var updateData = {
            topic_id: localStorage.topicId
          };

          updateData = $.extend({
            //order: this.get('order'),
            htmlBody: knoteDrafts[0].content
          }, updateData);
        }
        else{
          console.log("window event ended")
        }
      }
      else{
        localStorage.setItem('knoteDrafts', JSON.stringify(knoteDrafts));
      }

    }, 15000);
  }
});
