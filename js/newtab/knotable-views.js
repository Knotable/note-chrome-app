// 'use strict';

/*
* jQuery utility function to set a default value to an input field
*/
var loginWithPassword = window.loginWithPassword || knoteClient.loginWithPassword;

window.KnotableViews = function(events) {
  var arrViews = {};
  var _views = window.views = {};

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

  _views.BaseView = Backbone.View.extend({
    className: 'knotable-lightbox',
    isRendered: false,
    initialize: function() {
      this.events = this.events || {};
      _.extend(this.events, {
        'click .background': 'close',
        'click .close': 'close',
        'click .knotable-lightbox-inner': 'closeBox'
      });
    },
    _setHeight: function(height) {
      var knotableBox = this.$el.find(".knotable-box");
      knotableBox.height(height);
    },
    center: function() {
      var knotableBox = this.$el.find(".knotable-box");
      var scrW = window.innerWidth;
      var scrH = window.innerHeight;

      var viewW = knotableBox.width();
      var viewH = knotableBox.height();

      knotableBox.css("left", (scrW - viewW) / 2);
      knotableBox.css("top", (scrH - viewH) / 2);

      knotableBox.css("float", "none");
    },
    setRoundCorner: function(size) {
      var knotableBox = this.$el.find(".knotable-box");
      knotableBox.css("border-radius", size + "px");
    },
    checkClickedAway: function(evt) {
      var container = this.$el;
      if (!container.is(evt.target) && container.has(evt.target).length === 0) {
        this.collapse(true);
      }
    },
    scrollWithWindow: function(evt) {
      var scrollPos = $(document).scrollTop();
      this.$el.css('top', scrollPos + 'px');
    },
    render: function() {
      this.$el.html($(this.template()));
      var self = this;
      this.$el.attr('id', this.id + '-knotable');
      setTimeout(function() {
        self.$el.find('[autofocus]').focus();
        self.undelegateEvents();
        self.delegateEvents();
        self.$el.show();
      }, 300);

      return this;
    },
    hide: function() {
      this.$el.css('visibility', 'hidden');
    },
    show: function() {
      if ( !this.isRendered )
      {
        var ele = this.render().$el;
        var body = $('body').prepend(ele);
        if (window.isPopupView) {
          body.height((ele.find('.knotable-box')[0].offsetHeight + 14) + 'px');
        }
        this.isRendered = true;
      }
      this.$el.css('visibility', 'visible');
      return this;
    },
    close: function() {
      this.trigger('close');
      $(window).off('keydown');
      this.remove();

      this.isRendered = false;
    },
    closeBox: function(e) {
      if (!$(e.target).closest('.knotable-box').length) {
        this.close();
      }
    },
    ignoreClose: function() {
      return false;
    },
    centerPopup: function() {
      var knotableBox = this.$el.find(".knotable-box");
      var innerBox = this.$el.find(".knotable-lightbox-inner");

      innerBox.css( "background-color", "black" );
      innerBox.css( "opacity", "0.6" );

      knotableBox.removeClass("collapsed");

      this._setHeight( 400 );
      this.center();
      this.setRoundCorner( 6 );
    }
  });


  _views.ForgotPasswordView = _views.BaseView.extend({
    templateUrl: '/views/forgot-password.html',
    events: {
      'click #forgot-password-back-button': 'back',
      'click #forget-password-submit-button': 'resetPassword'
    },
    initialize: function() {
      var self = this;
      _views.ForgotPasswordView.__super__.initialize.apply(this);
    },
    back: function() {
      this.close();
      this.$el.empty();
      (new _views.LoginView()).show();
    },
    setStatus: function(status) {
      this.$el.find('#status-text').text(status);
    },
    resetPassword: function() {
      var email = this.$el.find('#recovery-email').val();
      if (!email) return;
      var self = this;
      knoteClient.call('forgotPassword', [{
        email: email
      }])
      .then(function() {
        self.$el.find('#forget-password-submit-button').hide();
        self.setStatus('Email sent. Please check your email.')
      })
      .fail(function(err) {
        self.setStatus(err);
      });
    },
    show: function() {
      var self = this;
      _views.ForgotPasswordView.__super__.show.apply(this);

      if ( typeof ( window.isPopupView ) == "undefined" &&  chrome.browserAction )
      {
        chrome.browserAction.getPopup({}, function(result) {
          if (result != "")
          self.centerPopup();
        });
      }
    }
  });


  _views.SignUpView = _views.BaseView.extend({
    templateUrl: '/views/sign-up.html',
    events: {
      'click #forgot-password-back-button': 'back',
      'click #forget-password-submit-button': 'resetPassword',
      'click #knotable-button-login': 'gotoLogin',
      'submit form': 'signup'

    },
    gotoLogin: function(evt) {
      evt.preventDefault();
      var self = this;
      self.hide();
      (new _views.LoginView()).show();
    },
    hide: function() {
      this.$el.addClass('hidden');
    },
    signup: function(evt) {
      if (evt && evt.type === 'submit' && evt.preventDefault) evt.preventDefault();
      var self = this;
      var signupData = {};
      var data = {};

      signupData.is_register      = true;
      signupData.username         = this.$el.find("#knotable-signup-username").val();
      signupData.email            = this.$el.find("#knotable-signup-email").val();
      signupData.password         = this.$el.find("#knotable-signup-password").val();

      if (signupData.username == "")
      {
        this.printStatus("Please input user name.");
        this.$el.find("#knotable-signup-username").focus();
        return;
      }

      var emailRegex = new RegExp(/\S+@\S+\.\S+/);
      if (!emailRegex.test(signupData.email))
      {
        this.printStatus("Please input valid email.");
        this.$el.find("#knotable-signup-email").focus();
        return;
      }
      else{
        data["email"] = signupData.email;
      }

      if (signupData.password == "")
      {
        self.printStatus("Please input password.");
        this.$el.find("#knotable-signup-password").focus();

        return;
      }
      else{
        data.password = signupData.password;
      }
      var loginData = {
        'loginData': data
      };

      this.$el.find("#knotable-button-signup")[0].disabled = true;
      self.printStatus('');
      knoteClient.call('createAccount', signupData).then(function(userData) {
        loginWithPassword(data.email, data.password)
        .then(function(a) {
          self.onSuccess.call(self, a);
          chrome.storage.local.set(loginData, $.noop);
          self.reset();
          self.hide();
          // chrome.runtime.reload();
        })
      }).fail(function(error) {
        //self.reset();
        self.$el.find("#knotable-button-signup")[0].disabled = false;

        if(error.reason === "Email already exists."){
          error.reason = "Email or Username already exists.";
        }
        self.printStatus(error.reason);
      });
    },
    onSuccess: function(data) {
      var view = this;
      _createNotification({
        message: 'Your account is in Knotable!'
      }, 1000);
      if (window.isPopupView) {
        window.close();
        (new _views.StatusView()).show();
        return;
      }
    },
    printStatus: function( strStatus, bError ) {
      bError = bError || true;
      this.$el.find("#signup_status").text( strStatus );
      this.$el.find("#signup_status").css("color", bError ? "rgb(248, 129, 129);" : "rgb(40, 173, 232)");
    },
    reset: function() {
      this.$el.find("#signup_status").text("");

      this.$el.find("#knotable-signup-username").val("");
      this.$el.find("#knotable-signup-email").val("");
      this.$el.find("#knotable-signup-password").val("");

      this.$el.find("#knotable-signup-username").focus();

      this.$el.find("#knotable-button-signup")[0].disabled = false;
    },
    initialize: function() {
      var self = this;
      _views.SignUpView.__super__.initialize.apply(this);
    },
    resetPassword: function() {
      var email = this.$el.find('#recovery-email').val();
      if (!email) return;
      var self = this;
      knoteClient.call('forgotPassword', [{
        email: email
      }])
      .then(function() {
        self.$el.find('#forget-password-submit-button').hide();
        self.setStatus('Email sent. Please check your email.');
      })
      .fail(function(err) {
        self.setStatus(err);
      });
    },
    show: function() {
      var self = this;
      _views.SignUpView.__super__.show.apply(this);

      setTimeout( function() {
        self.$el.find("#knotable-signup-username").focus();
      }, 500 );
    }
  });

  _views.LoginView = _views.BaseView.extend({
    templateUrl: '/views/login.html',
    collapsed: true,
    events: {
      'click #forgot-password': 'forgetPassword',
      'submit form': 'login',
      'click #knotable-google-login': 'googleLogin',
      'click #knotable-button-register': 'signup'
    },
    initialize: function(next) {
      console.log('login view initialize');
      _views.LoginView.__super__.initialize.apply(this);
      this.next = next;
    },
    render: function() {
      var self = this;
      self.hideLoginLoader();
      _views.LoginView.__super__.render.apply(this);

      var elmToFocus = '#knotable-login-username';
      setTimeout(function() {
        self.$el.find(elmToFocus).focus();
      }, 200);

      if (window.isPopupView) {
        this.$el.find('#knotable-box-login').removeClass('knotable-box-side');
        $('body').attr("class", "login-popup-body");
      }
      return this;
    },
    _showLoginLoader: function(){
      $("#login-btn-label").hide();
      $("#login-btn-loader").show();
    },
    hideLoginLoader: function(){
      $("#login-btn-label").show();
      $("#login-btn-loader").hide();
    },
    showNotification: function(text, view) {
      view = view || this;
      view.$el.find('#login_status')[0].innerText = text;
    },
    onSuccess: function(data) {
      var view = this;
      _createNotification({
        message: 'You are Logged into Knotable'
      }, 1000);

      if (window.isPopupView) {
        window.close();
        (new _views.StatusView()).show();
        return;
      }
    },
    onFail: function(view) {
      console.log(this, view);
      var self = this;
      var checkUserExists = knoteClient.call('doesAccountExist', [this.usernameOrEmail]);
      var message = 'Check your username and password and try again!';
      checkUserExists.done(function(userExists) {
        var loginButton = this.$el.find('#knotable-button-login');

        loginButton[0].disabled = false;
        loginButton.children().removeClass('knotable-hide');

        self.showNotification(message);
      });
    },
    login: function(evt) {
      var self = this;
      console.log('login form submitted');
      if (evt && evt.type === 'submit' && evt.preventDefault) evt.preventDefault();

      var self = this;
      var data = {};
      this.usernameOrEmail = this.$el.find('#knotable-login-username').val().toLowerCase();
      var usernameOrEmail = this.usernameOrEmail;
      var loginWith = 'email';

      var loginButton = this.$el.find('#knotable-button-login');
      loginButton.attr('disabled', true);
      self._showLoginLoader();

      if (usernameOrEmail.indexOf("@") === -1) {
        loginWith = 'username';
      }

      data[loginWith] = usernameOrEmail;
      data.password = this.$el.find('#knotable-login-password').val();

      var loginData = {
        'loginData': data
      };

      loginWithPassword(usernameOrEmail, data.password)
      .then(function(a) {
        self.onSuccess.call(self, a)

        chrome.storage.local.set(loginData, $.noop);
        self.hide();

        // chrome.runtime.reload();

      })
      .fail(function(err) {
        self.$el.find("#login_status").text("Check your username and password and try again!");

        self.shakeLoginForm("");

        loginButton[0].disabled = false;
        loginButton.children().removeClass('knotable-hide');
        self.hideLoginLoader();
      });
    },

    shakeLoginForm: function(eleForm){
      var l = 20;
      for( var i = 0; i < 10; i++ )
      $( "#knotable-box-login" ).animate( { 'margin-left': "+=" + ( l = -l ) + 'px' }, 50);
    },
    googleLogin: function(event) {
      console.log('google login');
      gapi.auth.authorize({client_id: GoogleOauthHelper.getClientId(), scope: GoogleOauthHelper.getScopes(), immediate: true}, function(authResult){
        if (authResult && !authResult.error) {
          gapi.client.load('oauth2', 'v2', function() {
            gapi.client.oauth2.userinfo.get().execute(function(resp) {
              // Shows user email
              console.log('oauth2 show user email', resp.email);
            })
          });

          // The person has authorized or is already logged in
          // pass a callback in future
          if(localStorage.getItem('sync-gmail')!== null && localStorage.getItem('sync-gmail') === "true" ){
            localStorage.setItem("sync-gmail", "false");
          }

          else if(localStorage.getItem('sync-gmail')!== null && localStorage.getItem('sync-gmail') === "false" ){
            localStorage.setItem("sync-gmail", "true");
          }

          else{
            localStorage.setItem("sync-gmail", "true");
          }

        } else {
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
                    localStorage.setItem("sync-gmail", "true");
                  }, 1000);
                }
              });
            } catch(e) {
              console.log(e)
            }
          }, 10000);
        }
      });
    },
    signup: function(evt) {
      evt.preventDefault();
      this.close();
      (new _views.SignUpView()).show();
      return;
    },
    forgetPassword: function() {
      this.close();
      (new _views.ForgotPasswordView()).show();
    },
    show: function() {
      var self = this;

      if ( typeof( window.isPopupView ) == "undefined" && chrome.browserAction )
      {
        chrome.browserAction.getPopup({}, function(result) {
          if (result != "")
          self.centerPopup();
        });
      }

      _views.LoginView.__super__.show.apply(this);

      var loginButton = this.$el.find('#knotable-button-login');
      loginButton[0].disabled = false;
      loginButton.children().removeClass('knotable-hide');

      self.hideLoginLoader();

      return this;
    },
    handleKeypress: function(e) {
    }

  });


  var _loadTemplates = function() {
    var loadingChain = $.Deferred();
    (function _loadNext(chrome, views, viewsKeys, idx) {
      viewsKeys = viewsKeys || Object.keys(views);
      idx = ~~idx;
      if (idx >= viewsKeys.length) {
        return loadingChain.resolve();
      }
      var viewName = viewsKeys[idx];
      var view = _views[viewName];

      if (view.prototype.templateUrl && !view.prototype.template) {
        switch(view.prototype.templateUrl){
          case '/views/forgot-password.html':
          view.prototype.template = function(obj){
            var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
            with(obj||{}){
            __p+='<div class="knotable-lightbox-inner"></div> <div id="knotable-boxforgot_password" class="knotable-box knotable-box-side collapsed"> <div class="knotable-box-title text-center">Forgot <span>Password</span>?</div> <section> <div class="input-wrapper"> <input type="text" class="input-title input-textbox" id="recovery-email" placeholder="Email"> </div> <p class="knotable-p" id="status-text">Please enter your email in the box above and press "Submit" to retrieve your password.</p> <div class="buttons"> <input id="forget-password-submit-button" type="button" class="knotable-button knotable-button-full" value="Submit"/> <div>&nbsp;</div> <input type="button" class="knotable-button knotable-button-full" id="forgot-password-back-button" value="Go back"/> </div> </section> </div>';
            }
            return __p;
            };
          break;
          case '/views/login.html':
          view.prototype.template = function(obj){
            var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
            with(obj||{}){
            __p+='<div class="knotable-lightbox-inner"></div> <div id="knotable-box-login" class="knotable-box knotable-box-side"> <div> <span class="knotable-logo"></span> </div> <div class="knotable-box-title text-center">Welcome to Knotable</div> <div> <p class="knotable-p" id="login_status"></p> <form> <div class="input-wrapper"> <input type="text" class="input-textbox" value="" name="email" id="knotable-login-username" placeholder="Username or email" autofocus autocomplete="off"> </div> <div class="input-wrapper input-wrapper-icon"> <input type="password" class="input-textbox" value="" name="password" id="knotable-login-password" placeholder="Enter password" autocomplete="off"> <a id="forgot-password" class="knotable-link-forget-password">?</a> </div> <div class="knotable-buttons"> <button type="submit" class="knotable-button knotable-button-full" id="knotable-button-login"> <span id="login-btn-label">SIGN IN </span> <img id="login-btn-loader" src="../images/loader.gif" style="width: 40px;   height: 10px;"> </button> </div> <!-- <div class="knotable-buttons"> <button type="button" class="knotable-button knotable-button-full" id="knotable-google-login"> <span>Google Login</span> </button> </div> --> <p class="knotable-p text-center">Don\'t have an account? <a ';
            }
            return __p;
          };
          break;
          case '/views/sign-up.html':
            view.prototype.template = function(obj){
              var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
              with(obj||{}){
              __p+='<div class="knotable-lightbox-inner"></div> <div id="knotable-box-login" class="knotable-box knotable-box-side"> <div> <span class="knotable-logo"></span> </div> <div class="knotable-box-title text-center">Sign Up</div> <div> <p class="knotable-p" id="signup_status"></p> <form> <div class="input-wrapper"> <input type="text" class="input-textbox" value="" name="username" id="knotable-signup-username" placeholder="Enter a username" autofocus autocomplete="off"> </div> <div class="input-wrapper"> <input type="text" class="input-textbox" value="" name="email" id="knotable-signup-email" placeholder="Enter e-mail" autofocus autocomplete="off"> </div> <div class="input-wrapper input-wrapper-icon"> <input type="password" class="input-textbox" value="" name="password" id="knotable-signup-password" placeholder="Enter password" autocomplete="off"> </div> <div class="knotable-buttons"> <button type="submit" class="knotable-button knotable-button-full" id="knotable-button-signup"> <span>SIGN UP</span> <i class="fa fa-spinner fa-spin knotable-hide"></i> </button> </div> <p class="knotable-p text-center">Already have an account? <a id="knotable-button-login">Log In</a></p> </form> </div> </div>';
              }
              return __p;
            };
          break;
        }
      _loadNext(chrome, views, viewsKeys, ++idx);
        // $.get(view.prototype.templateUrl).then(function(resp) {
        //   console.log("long", view.prototype.templateUrl, resp);
        //   // view.prototype.template = _.template(resp);
        //   _loadNext(chrome, views, viewsKeys, ++idx);
        // });
      } else {
        _loadNext(chrome, views, viewsKeys, ++idx);
      }

    })(chrome, _views);
    return loadingChain.promise();
  };


  var _getView = function(viewName) {
    if (!viewName) {
      return _views;
    }
    return _views[viewName];
  };

  var _switchView = function(viewName) {
    for (var view in arrViews) {
      view == viewName ? arrViews[view].show() : arrViews[view].hide();
    }
  };


  return {
    bringToUpView: _switchView,
    createNotification: _createNotification,
    getView: _getView,
    loadTemplates: _loadTemplates,
    events: events
  };
};
