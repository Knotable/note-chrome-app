'use strict';


window.localStorageNote = (function(){

  var data = {};

  var setItem = function(name, value){
    data[name] = value;
  };
  var getItem = function(name){
    return data[name];
  };

  var removeItem = function(name){
    delete data[name];
    return true;
  }

  return {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem
  };

})();

console.log("localStorageNote long", localStorageNote);
