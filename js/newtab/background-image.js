'use strict';

(function(){
  var imagesHostUrl = 'https://s3.amazonaws.com/knotable-assets-alpha/chrome-images-new/';
  var BackgroundView = Backbone.View.extend({
    el: '.knotable-body',
    initialize: function(options) {
      _.extend(this, options);
      _.bindAll(this, 'fail', 'always', 'done');
      this.listenTo(this.collection, 'reset', this.setBg);
      this.backgrounImgElm = $('img.background-img');
      $(window).resize(this.onResize.bind(this));
      this.onResize();
    },
    setBg: function() {
      var start = new Date().getTime();
      var d = new Date(),
      days = d.getDate(),
      localBgDate = localStorage.bgDate || d,
      localBgId = localStorage.bgId || 0,
      _bgDate = new Date(localBgDate),
      _bgDays = _bgDate.getDate();

      if (days != _bgDays) {
        if (!localStorage.isNext) {
          localStorage.bgId = 0;
        } else {
          localStorage.bgId = parseInt(localBgId) + 1;
          localStorage.bgDate = d;
        }
      } else {
        localStorage.bgId = localBgId;
        localStorage.bgDate = d;
      }

      this.bgImage = localStorage.bgId == 0 || !localStorage.bgId ? '../images/bg_0.webp' : imagesHostUrl + 'bg_' + localStorage.bgId + '.webp';

      localStorage.setItem("bgImage", this.bgImage);
      this.requestImage();

      var end = new Date().getTime();
      var time = end - start;
      console.log('%cExecution time: ' + time , 'color: red;' );
    },

    _setClock: function() {
      var hour = moment().format('hh:mm');
      var date = moment().format('dddd, MMMM D');
      $(".clock-hour").html(hour);
      $(".clock-date").html(date);
    },

    setBase64Image: function(url, id) {
      var self = this,
      dataURL,
      image = new Image();
      image.onload = function() {
        // Create an empty canvas element
        var canvas = document.createElement('canvas');

        canvas.width = image.width * 0.5;
        canvas.height = image.height * 0.5;

        // Copy the image contents to the canvas
        var ctx = canvas.getContext("2d");
        //ctx.drawImage(image, 0, 0);

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        ctx.drawImage(canvas, 0, 0, canvas.width * 0.5, canvas.height * 0.5);

        ctx.drawImage(canvas, 0, 0, canvas.width * 0.5, canvas.height * 0.5,
          0, 0, canvas.width, canvas.height);

        var dataURL = canvas.toDataURL("image/webp");

        console.log("**************************")
        console.log("width: " + image.width + " "+ "Height: " + image.height)
        console.log("**************************")
        // Set on localStorage
        self.collection.create({
          id: id,
          image: dataURL
        });
      };
      console.log('%csetting image !', 'color: red;');
      image.src = url;
    },
    resetToZero: function(statsus) {
      if (statsus !== 0) {
        localStorage.bgId = 0;
      }
    },
    fail: function(res) {
      this.resetToZero(res.status)
      this.always();
      this.$el.css('background-image', 'url("../images/bg_0.webp")').addClass('bg-image-0');
    },

    always: function() {
      var self = this;
      this._setClock();
      setInterval(function() {
        self._setClock();
      }, 1000);
      setTimeout(bootstrap, 500);

      setTimeout(function() {
        self.requestNextImage();
      }, 1500);
    },

    done: function() {
      var id = parseInt(localStorage.getItem('bgId'), 10);
      if ((id != '0') && !this.collection.get(id)) {
        !this.isCached() && this.setBase64Image(this.bgImage, id);
      }

      // load next image
      localStorage.setItem('isNext', true);

      this.always();
      this.$el.css('background-image', 'url("' + this.bgImage + '")')
      .addClass('bg-image-' + id);
      this.emerge(this.bgImage)
    },

    emerge: function( src ) {
      $('img.background-img').attr('src', src )

      $('img.background-img').load(function() {
        $('div.white-screen').height(window.innerHeight);
        $('img.background-img').css('visibility', 'visible');
        $('div.white-screen').css('opacity', 0);

        setTimeout( function() {
          $('div.white-screen').remove();
        }, 1000 );
      });
    },

    isCached: function() {
      var id = parseInt(localStorage.getItem('bgId'), 10),
      preImageModel = this.collection.get((id - 1)),
      imageModel = this.collection.get(id);

      preImageModel && preImageModel.destroy();
      return id && imageModel;
    },
    requestImage: function() {

      var id = parseInt(localStorage.getItem('bgId'), 10);
      if (this.isCached()) {
        var imageModel = this.collection.get(id);
        var imgSrc = imageModel.get('image');

        //imgSrc = '/images/bg_0.webp';

        $('img.background-img').attr('src', imgSrc )


        this.emerge(imgSrc)

        this.$el.css('background-image', 'url("' + this.bgImage + '")')
        .addClass('bg-image-' + id);

        this.always();
      } else {
        // make request
        var $image = $.get(this.bgImage);
        //when request successful
        $image.done(this.done);
        console.log( this )
        //when request fail
        $image.fail(this.fail);
        // return deferred
        return $image;
      }
    },
    requestNextImage: function() {
      var self = this,
      id = parseInt(localStorage.getItem('bgId'), 10);
      var nextId = ++id,
      nextImage = imagesHostUrl + 'bg_' + nextId + '.webp';
      if (!this.collection.get(nextId)) {
        // make request
        var $image = $.get(nextImage);
        $image.done(function() {
          self.setBase64Image(nextImage, nextId);
          localStorage.setItem('isNext', true);
        });
        $image.fail(function(res) {
          localStorage.setItem('isNext', '');
        });
      }
    },
    onResize: function() {
      var img = this.backgrounImgElm;
      var $window = $(window),
      wndHeight = $window.height(),
      wndWidth = $window.width();

      var aspectRatio = wndWidth > wndHeight ? wndWidth / wndHeight : wndHeight / wndWidth;

      if((wndHeight > wndWidth) || aspectRatio < 1.5) {
        img.css({width: 'auto', height: '100%'});
      } else {
        img.css({width: '100%', height: 'auto'});
      }
    }

  });

  var database = {
    id: "images-database",
    description: "The database for the Images",
    migrations: [{
      version: 1,
      migrate: function(transaction, next) {
        var store = transaction.db.createObjectStore("images");
        next();
      }
    }]
  };

  var KnoteImageModel = Backbone.Model.extend({
    database: database,
    storeName: "images"
  });

  var KnoteImagesCollection = Backbone.Collection.extend({
    initialize: function() {
      this.fetch({
        reset: true
      });
    },
    database: database,
    storeName: "images",
    model: KnoteImageModel
  });

  $(document).ready(function() {
    new BackgroundView({
      collection: new KnoteImagesCollection()
    });
  });

})();
