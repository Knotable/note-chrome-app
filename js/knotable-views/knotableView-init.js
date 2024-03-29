var getContentAsText = function(html) {
  if ($.isArray(html)) {
    html = html[0];
  }
  var text = html;
  try {
    var elm = $('<div></div>');
    elm.append(html);
    if (elm && elm.length) {
      text = elm[0].innerText;
    }
  } catch (e) {
    console.error(e);
  }
  return text.trim();

};

var _addKnoteOnView = function(knotesView, newKnote) {
  var knote = knotesView.collection.find(function(model) {
    return (model.get('knoteId') === newKnote._id);
  });

  var knoteBody = '';
  if(!_.isEmpty(newKnote.title))
  knoteBody += newKnote.title;

  if (!_.isEmpty(newKnote.htmlBody) || !_.isEmpty(newKnote.body))
  knoteBody += "\n\n" + newKnote.htmlBody || newKnote.body || '';
  var content = getContentAsText(knoteBody) || 'new';

  if (!knote) {
    knote = new KnoteModel(newKnote);
    knote.set({
      content: content,
      knoteId: newKnote._id,
      collection: knotesView.collection,
      date: newKnote.date
    });
    newKnote.content = content;
    DropboxClient.syncKnote(newKnote);
    knotesView.collection.add(knote);
  } else {
    // if the knote is currently edited, do nothing
    var isActiveKnote = (function(activeKnote, newKnote) {
      if (!activeKnote) return;
      if (newKnote._id === activeKnote.get('knoteId')) return true;
    })(_knotesView.activeKnote, newKnote);
    newKnote.content = content;
    DropboxClient.syncKnote(newKnote);
    if (isActiveKnote) return;
    knote.set({content: content, order: newKnote.order, timestamp: newKnote.timestamp});
  }
};

var onNotification = function(knotesView, request, sender, response) {
  var _removeKnoteOnView = function(knoteId){
    var knote = knotesView.collection.find(function(knote) {
      return (knote.get('knoteId') === knoteId);
    });
    knotesView.collection.remove(knote);
  };

  var newKnote = request.knote;
  switch(request.msg){
    case 'addKnote':
    _addKnoteOnView(knotesView, newKnote);
    break;
    case 'updateKnote':
    _addKnoteOnView(knotesView, newKnote);
    break;
    case 'removeKnote':
    _removeKnoteOnView(request.knoteId);
    break;
    default:
    return;
  };
  console.log("knote message", request.msg, request.knoteId || request.knote._id + request.knote.title);
};

var bootstrap = function() {

  KnoteModel = new KnotableModels().models.Knote;
  var knotes = new KnotesCollection();
  var knotesView = new KnotesView(knotes);
  window._knotes = knotes;
  window._knotesView = knotesView;

  window._knotesView.headerView = new HeaderView();
  window._knotesView.headerView.render();

  knotesView.render();
  chrome.runtime.onMessage.addListener(onNotification.bind(this, knotesView));
};


window.config = getConfig(runtime_mode);
$(document).ready(function() {
  new introBoxView().render();
  localStorage.setItem("isIntroSeen", "true");

  $("#knote-sync-message").css("visibility", "hidden");

  if(!offlineMode.isOffline()){
      offlineMode.syncOfflineKnotes();
      offlineMode.syncCreateKnotes();
  }
});
