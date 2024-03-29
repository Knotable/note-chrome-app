var KnotesView = Backbone.View.extend({
  el: '#knotes-container',
  events: {
    'click #btn-add-knote': 'saveCurrentKnote',
    'click #btn-add-knote-plus': 'createKnote',
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
          new self.LoginView().hide();
      } else {
          new self.LoginView().show();
      }
    }).fail(function(){
        new self.LoginView().show();
    });
  },

  _randomLocalKnoteID: function (L){
      var s= '';
      var randomchar=function(){
        var n= Math.floor(Math.random()*62);
        if(n<10) return n; //1-10
        if(n<36) return String.fromCharCode(n+55); //A-Z
        return String.fromCharCode(n+61); //a-z
      }
      while(s.length< L) s+= randomchar();
      return s;
    },

  _createKnoteOffline: function(){
    var self = this;
    self.offlineCreateKnotes = [];
    chrome.storage.local.get('offlineCreateKnotes', function (result) {
        if(!_.isEmpty(result)){
          self.offlineCreateKnotes = result.offlineCreateKnotes;
        }

        // if(!window.currentLocalKnote){
        //   window.currentLocalKnote = self._randomLocalKnoteID(10);
        // }

        var knote = {
          "localID": self.localKnoteID,
          "subject":"",
          "body":"",
          "htmlBody":$("#knote-edit-area").val().trim(),
          "topic_id":localStorage.topicId
        };

        var matchedKnotes = _.findWhere(self.offlineCreateKnotes, {'localID':knote.localID});

        if(matchedKnotes){
          console.log("***********************")
          console.log(matchedKnotes)
          console.log("***********************")
          matchedKnotes.htmlBody = $("#knote-edit-area").val().trim();
        }
        else{
          self.offlineCreateKnotes.push(knote);
        }
        chrome.storage.local.set({'offlineCreateKnotes': self.offlineCreateKnotes});
    });
  },
  createKnote: function(content) {
    if(this.activeKnote){
      this.$el.find("#knote-edit-area").val('').focus();
      this.$el.find(".list-knote.active").removeClass("active");
      this.tmpl = function(obj){
        var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
        with(obj||{}){
        __p+='\n                <li class="list-group-item list-knote new-knote active" style="margin-bottom: 0px;border:none;border-bottom: 1px solid #ddd"><div class="body" style="height: 18px"><strong>new</strong></div></li>\n            ';
        }
        return __p;
        };
      this.$el.find("#knotes-list").prepend(this.tmpl);

      this._updateKnote();
      this.activeKnote = null;
      if(offlineMode.isOffline()){
        var random = this._randomLocalKnoteID(10);
        $(".list-knote.active").attr("data-knoteLocalId", random);
        this.localKnoteID = random;
      }
      return null;
    }

    if (!(content && _.isString(content))) {
      content = this._getEditAreaContent();
    }

    if(_.isEmpty(content)){
      return null;
    }

    var nextOrder = _.min(this.collection.pluck('order'));
    if (!isFinite(nextOrder)) nextOrder = 1;
    var newKnote = new KnoteModel({
      order: nextOrder - 1,
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
    this.collection.on('change', this.onKnoteChanged, this);
    this.collection.on('timeStampUpdate', this.onTimeStampUpdated, this);

    this.searchView = new SearchBoxView();
    var self = this;
    this.$el.find('#knotes-list').sortable({
      containment: 'parent',
      items: 'li.list-group-item',
      stop: function(evt, ui) {
        var prevId = ui.item.prev().attr("data-knoteid");
        var nextId = ui.item.next().attr("data-knoteid");

        var prevKnote = self.collection.findWhere({_id: prevId});
        var nextKnote = self.collection.findWhere({_id: nextId});
        nextKnote = nextKnote || prevKnote;
        prevKnote = prevKnote || nextKnote;
        var maxOrder = _.max([this.prevOrder, this.nextOrder, prevKnote.get("order"), nextKnote.get('order')]);
        var minOrder = _.min([this.prevOrder, this.nextOrder, prevKnote.get("order"), nextKnote.get('order')]);
        var $knotes = $("#knotes-list li").filter(function(knote){
          var order = parseInt($(this).attr("data-order"));
          if(order < minOrder || order > maxOrder){
            return false;
          } else {
            return true;
          }
        });
        if ($knotes.length <= (maxOrder-minOrder+1)){
          var order = minOrder;
          _.each($knotes, function(knote){
            var knoteId = $(knote).attr("data-knoteid");
            if($(knote).attr("data-order") !== order){
              self.collection.findWhere({_id: knoteId}).set({order: order});
              knoteClient.updateKnote(knoteId, {order: order++});
            }
          })
        }
        return
        var knoteId = ui.item.attr("data-knoteid");
        var options = {order: newOrder};
        knoteClient.updateKnote(knoteId, options)
        .then(function(){
          console.log("Update knote", knoteId, " Success!");
        })
        .fail(function(){
          console.error("Update knote", knoteId, " FAILED!");
        });
      },
      start: function(evt, ui){
        var order = ui.item.attr("data-order");
        this.prevOrder = parseInt(ui.item.prev().attr("data-order") || order);
        this.nextOrder = parseInt(ui.item.next().attr("data-order") || order);
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
    this.localKnoteID = this._randomLocalKnoteID();
    return this;
  },

  _clearOfflineKnotes: function(){
    chrome.storage.local.set({'offlineEditKnotes': []});
  },

  _updateKnoteOffline: function(){
       var self = this;
       self.offlineEditKnotes = []

       if(!self.activeKnote){
         this._createKnoteOffline();
         return;
       }

       var knoteId = self.activeKnote.get("_id") || self.activeKnote.get("knoteId");

       if(!knoteId){
         this._createKnoteOffline();
         return;
       }

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

  updateKnoteText: function(e) {
    var textarea = $(e.currentTarget);
    var val = textarea.val().trim();
    var self = this;

    if(offlineMode.isOffline()){
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
      this.activeKnote.trigger('activate', true);
    }
  },

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
  _sortKnotesList: function(){
    var $knotes = this.$el.find('#knotes-list');
    var $knotesLi = $knotes.find("li");
    $knotesLi.sort(function(knoteA, knoteB){
      if($(knoteA).hasClass("new-knote")){
        return -1;
      }
      if($(knoteB).hasClass("new-knote")){
        return 1;
      }
      var orderA = parseInt(knoteA.getAttribute('data-order'));
  		var orderB = parseInt(knoteB.getAttribute('data-order'));

      if(orderA > orderB){
        return 1;
      } else if (orderA < orderB){
        return -1;
      } else {
        var timeA = parseInt(knoteA.getAttribute('data-timestamp'));
        var timeB = parseInt(knoteB.getAttribute('data-timestamp'));
        if(timeA > timeB){
          return -1;
        } else {
          return 1;
        }
      }

      return 0;
    });
    $knotesLi.detach().appendTo($knotes);
  },

  onKnoteAdded: function(model) {
    var self = this;
    var date = new Date(model.get("updated_date"));

    if ( model.get('archived') )
    return this;

    knoteView = new KnoteView(model);

    knoteView = knoteView.render().$el;
    this.$el.find('#knotes-list').append(knoteView);
    this._sortKnotesList();
    return this;
  },
  onKnoteRemoved: function(knote, collection, idx) {
    var self = this;
    knote.trigger('destroy');
    this.setActiveKnote.bind(this, this.collection.models[idx.index - 1]);

  },
  onKnoteChanged: function(knote, collection, idx) {
    this._sortKnotesList();
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

    this.$el.find('#btn-delete-knote').removeAttr('disabled');
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

      if(localStorage.getItem('knoteDrafts')){
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
          //console.log("window event ended")
        }
      }
      else{
        localStorage.setItem('knoteDrafts', JSON.stringify(knoteDrafts));
      }

    }, 15000);
  }
});
