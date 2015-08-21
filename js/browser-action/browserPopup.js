var browserActionPopup = (function ($) {
  // ... all vars and functions are in this scope only
  // still maintains access to all globals
  window.currentKnote = null;
  window.inProcess = false;

  var getTitle = function(){

  };

  var initPopup = function(){
    var currentKnoteID = localStorage.getItem('currentKnoteID');
    var currentKnoteText = localStorage.getItem('currentKnoteText');

    if(currentKnoteID){
      window.currentKnote = currentKnoteID;
    }

    if(currentKnoteText){
      $("#knote-textarea").val(currentKnoteText);
    }

    if(currentKnoteID && currentKnoteText){
      //update knote
      console.log("knote hard updated")
      var options = getUpdateOptions();

      knoteClient.updateKnote(window.currentKnote, options)
      .then(function(){
        console.log("Update knote", window.currentKnote, " Success!");
      })
      .fail(function(){
        console.error("Update knote", window.currentKnote, " FAILED!");
      })
    }
  };

  var setCurrentKnoteDetails = function(id, text){
    localStorage.setItem('currentKnoteID', id);
    localStorage.setItem('currentKnoteText', text);
  };

  var getBody = function(){
    var knoteText = $("#knote-textarea").val().trim();
    var contentArray = _.compact(knoteText.split('\n'));

    var title = contentArray[0];
    var body = knoteText.slice(title.length).trim();
    console.debug(body)
    return body;
  };

  var showLoading = function(){
    $("#knotable-popup").attr("disabled", true)
    $("#knotable-popup").text("saving...")
  };

  var hideLoading = function(){
    $("#knotable-popup").attr("disabled", false)
    $("#knotable-popup").text("Add knote")
  };

  var addNewKnote = function(){
    $("#btn-add-knote").click(function(){
      window.currentKnote = null;
      $("#knote-textarea").val("");
      $("#knote-textarea").focus();
      window.inProcess = false;
      localStorage.removeItem('currentKnoteID');
      localStorage.removeItem('currentKnoteText');
    });
  };

  var getUpdateOptions = function(){

    var data = {};
    var content = $("#knote-textarea").val().trim();

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
  };

  var updateKnote = function(){
    $('#knote-textarea').keyup(_.throttle(function() {
      if(window.currentKnote === null){
        //create a new knote and make it current
        if(window.inProcess){
          return;
        }
        var data = {
          "subject":"",
          "body":"",
          "htmlBody":$("#knote-textarea").val().trim(),
          "topic_id":localStorage.topicId
        };
        showLoading();
        window.inProcess = true;
        knoteClient.addKnote(data).then(function(knoteID){
          window.currentKnote = knoteID;
          setCurrentKnoteDetails(knoteID, data.htmlBody)
          window.inProcess = false;
          hideLoading();
        }).fail(function(){
          hideLoading();
        });
      }
      else{
        //update the current knote
        var options = getUpdateOptions();
        var knoteText = $("#knote-textarea").val().trim();

        setCurrentKnoteDetails(window.currentKnote, knoteText)

        knoteClient.updateKnote(window.currentKnote, options)
        .then(function(){
          console.log("Update knote", window.currentKnote, " Success!");
        })
        .fail(function(){
          console.error("Update knote", window.currentKnote, " FAILED!");
        })
      }
    }, 1500));
  };

  var openNewTab = function(){
    $("#btn-open-tab").click(function(){
      chrome.tabs.create({ url: chrome.extension.getURL('newtab.html') });
    });
  };

  var init = function(){
    //addKnote();
    initPopup();
    addNewKnote();
    updateKnote();
    openNewTab();
  };

  return{
    init: init
  };
}(jQuery));

$(document).ready(function () {
  browserActionPopup.init();
});
