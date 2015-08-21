// 'use strict';

var KnoteModel;

var KnotesCollection = Backbone.Collection.extend({
  model: KnoteModel
});

var KnoteView = Backbone.View.extend({
  className: 'list-group-item',
  tagName: 'li',
  events: {
    'click': 'focusKnote'
  },
  focusKnote: function(e) {
    if(window._knotesView.activeKnote)
    var knoteId = window._knotesView.activeKnote.attributes._id;
    else
    var knoteId = undefined;
    var options = window._knotesView._getUpdateOptions();

    if(knoteId){
      window._knotesView._showSyncLoader();
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

    window._knotesView.setActiveKnote(this.model);

  },
  initialize: function(model) {
    this.template = function(obj){
      var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
      with(obj||{}){
      __p+='\n            <li data-knoteid="'+
      ((__t=( knoteId ))==null?'':__t)+
      '" class="list-group-item list-knote">\n                <div class="body">\n                    <strong> '+
      ((__t=( content.length ? (c = content.split('\n')[0], c.length < 25 ? c : c.substr(0, 23) + '...') : '' ))==null?'':__t)+
      ' </strong>\n                </div>\n                <div class="date"> '+
      ((__t=( new moment(updated_date || date).fromNow() ))==null?'':__t)+
      ' </div>\n            </li>\n            ';
      }
      return __p;
      }
    this.model = model;
    var self = this;
    this.model.bind('save', function(resp) {
      self.$el.attr('data-knoteid', resp.knoteId);
    });
    this.model.bind('change', this.render, this);
    this.model.bind('destroy', this.remove, this);
    this.model.bind('toggleView', this.toggleView, this);
    this.model.bind('activate', this.activate, this);

    setInterval( function() {
      var offset = new moment(self.model.get("updated_date")).fromNow();
      self.$el.find(".date").html(offset);
    }, 1000 );

  },
  activate: function(active) {
    var fn = active ? 'addClass' : 'removeClass';
    this.$el[fn]('active');
  },
  remove: function() {
    this.$el.fadeOut('fase', this.$el.remove.bind(this.$el));
  },
  toggleView: function(toggle) {
    var fn = toggle ? 'fadeIn' : 'fadeOut';
    this.$el[fn]();
  },
  render: function() {
    var newElm = $(this.template(this.model.toJSON()));
    this.$el.replaceWith(newElm);
    this.setElement(newElm);

    return this;
  }
});
