var UserAvatarModel = Backbone.Model.extend({
  defaults: {
    username: '',
    fullname: '',
    avatar: {}
  }
});

var UserAvatarView = Backbone.View.extend({
  el: '.user-avatar-container',
  initialize: function() {
  },
  render: function() {
    if(this.model){
      var username = this.model.get('username');
      var fullname = this.model.get('fullname');
      var avatar = this.model.get('avatar');

      if(username !== null){
        this.$el.find('#user-avatar-username').text("@" + username);
      }
      if(fullname !== null){
        this.$el.find('#user-avatar-displayname').text(fullname);
      }
      if(avatar !== null && avatar === "false"){
        this.$el.find('#userAvatar').addClass('knotable-user-avatar');
        var text = username[0].toUpperCase();
        this.$el.find('#userAvatar').html(text);
      }
      if(avatar !== null && avatar !== "false"){
        var imgHtml = "<img style='width: 50px; height: 50px; border-radius: 50%;' src='" + avatar + "' />";
        $('#userAvatar').html(imgHtml);

        $('#userAvatar img').error( function() {
          $('#userAvatar').addClass('knotable-user-avatar');
          if(username){
            var text = username[0].toUpperCase();
            $('#userAvatar').html(text);
          }
        });
      }

      this.$el.removeClass('knotable-hide');
    }
  }
});
