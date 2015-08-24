var HeaderView = Backbone.View.extend({
  el: '#newtab-header',
  events: {
    'click #user-logout': 'logout',
    'click #newtab-topic-id': 'kClicked',
    'click #google-apps': 'gAppClicked',
    'click #btn-sync-knotes': 'settingsKnoteSync'
  },

  settingsKnoteSync: function(){
    var self = this;
    self.KnotesSyncView = self.KnotesSyncView || new KnotesSyncView();
    self.KnotesSyncView.render();
  },

  kClicked: function(){
    googleAnalyticsHelper.trackAnalyticsEvent('K button', 'clicked');
  },

  gAppClicked: function(){
    googleAnalyticsHelper.trackAnalyticsEvent('Google Apps button', 'clicked');
  },

  logout: function() {
    knoteClient.logout().then(function() {
      if(self.avatarView){
        self.avatarView.remove();
      }
    });
  },

  initialize: function() {
    console.log("HeaderView initialize");
  },

  _setKUrl: function(){
    var self = this;
    var topicUrl = config.protocol + "://" + config.domain;
    knoteClient.getTopicId().then(function(topicId) {
      if (!_.isEmpty(topicId)) {
        topicUrl += "/t/0/" + topicId;
        localStorage.topicId = topicId;
      } else {
        localStorage.topicId = null;
      }
      self.$el.find('#newtab-topic-id').attr('href', topicUrl);
    }).fail(function(){
      self.$el.find('#newtab-topic-id').attr('href', topicUrl);
    });
  },

  render: function() {
    var self = this;
    knoteClient.getUserInfo().then(function(contact) {
      console.log("headerview contacts", contact);
      if (contact){
        self.avatarView = new UserAvatarView(new UserAvatarModel(contact));
        window._knotesView.contact = contact;
        localStorage.userName = contact.username;
      } else {
        if(self.avatarView){
          self.avatarView.remove();
        }
      }
    });
    this._setKUrl();
  }
});
