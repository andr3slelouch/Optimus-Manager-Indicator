/**
 * The fromXML() method parses an XML string, constructing the JavaScript
 * value or object described by the string.
 *
 * @function fromXML
 * @param text {String} The string to parse as XML
 * @param [reviver] {Function} If a function, prescribes how the value
 * originally produced by parsing is transformed, before being returned.
 * @returns {Object}
 * 
 * source: https://raw.githubusercontent.com/kawanet/from-xml/master/from-xml.js
 */

 //var fromXML;
  /*export function fromXML(text, reviver) {
    return toObject(parseXML(text), reviver);
  }

 (function(exports) {
   var UNESCAPE = {
     "&amp;": "&",
     "&lt;": "<",
     "&gt;": ">",
     "&apos;": "'",
     "&quot;": '"'
   };

   var ATTRIBUTE_KEY = "@";
   var CHILD_NODE_KEY = "#";

   //exports.fromXML = fromXML = _fromXML;
 

 
   function parseXML(text) {
     var list = String.prototype.split.call(text, /<([^!<>?](?:'[\S\s]*?'|"[\S\s]*?"|[^'"<>])*|!(?:--[\S\s]*?--|\[[^\[\]'"<>]+\[[\S\s]*?]]|DOCTYPE[^\[<>]*?\[[\S\s]*?]|(?:ENTITY[^"<>]*?"[\S\s]*?")?[\S\s]*?)|\?[\S\s]*?\?)>/);
     var length = list.length;
 
     // root element
     var root = {f: []};
     var elem = root;
 
     // dom tree stack
     var stack = [];
 
     for (var i = 0; i < length;) {
       // text node
       var str = list[i++];
       if (str) appendText(str);
 
       // child node
       var tag = list[i++];
       if (tag) parseNode(tag);
     }
 
     return root;
 
     function parseNode(tag) {
       var tagLength = tag.length;
       var firstChar = tag[0];
       if (firstChar === "/") {
         // close tag
         var closed = tag.replace(/^\/|[\s\/].*$/g, "").toLowerCase();
         while (stack.length) {
           var tagName = elem.n && elem.n.toLowerCase();
           elem = stack.pop();
           if (tagName === closed) break;
         }
       } else if (firstChar === "?") {
         // XML declaration
         appendChild({n: "?", r: tag.substr(1, tagLength - 2)});
       } else if (firstChar === "!") {
         if (tag.substr(1, 7) === "[CDATA[" && tag.substr(-2) === "]]") {
           // CDATA section
           appendText(tag.substr(8, tagLength - 10));
         } else {
           // comment
           appendChild({n: "!", r: tag.substr(1)});
         }
       } else {
         var child = openTag(tag);
         appendChild(child);
         if (tag[tagLength - 1] === "/") {
           child.c = 1; // emptyTag
         } else {
           stack.push(elem); // openTag
           elem = child;
         }
       }
     }
 
     function appendChild(child) {
       elem.f.push(child);
     }
 
     function appendText(str) {
       str = removeSpaces(str);
       if (str) appendChild(unescapeXML(str));
     }
   }
 
   function openTag(tag) {
     var elem = {f: []};
     tag = tag.replace(/\s*\/?$/, "");
     var pos = tag.search(/[\s='"\/]/);
     if (pos < 0) {
       elem.n = tag;
     } else {
       elem.n = tag.substr(0, pos);
       elem.t = tag.substr(pos);
     }
     return elem;
   }
 
   function parseAttribute(elem, reviver) {
     if (!elem.t) return;
     var list = elem.t.split(/([^\s='"]+(?:\s*=\s*(?:'[\S\s]*?'|"[\S\s]*?"|[^\s'"]*))?)/);
     var length = list.length;
     var attributes, val;
 
     for (var i = 0; i < length; i++) {
       var str = removeSpaces(list[i]);
       if (!str) continue;
 
       if (!attributes) {
         attributes = {};
       }
 
       var pos = str.indexOf("=");
       if (pos < 0) {
         // bare attribute
         str = ATTRIBUTE_KEY + str;
         val = null;
       } else {
         // attribute key/value pair
         val = str.substr(pos + 1).replace(/^\s+/, "");
         str = ATTRIBUTE_KEY + str.substr(0, pos).replace(/\s+$/, "");
 
         // quote: foo="FOO" bar='BAR'
         var firstChar = val[0];
         var lastChar = val[val.length - 1];
         if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
           val = val.substr(1, val.length - 2);
         }
 
         val = unescapeXML(val);
       }
       if (reviver) {
         val = reviver(str, val);
       }
       addObject(attributes, str, val);
     }
 
     return attributes;
   }
 
   function removeSpaces(str) {
     return str && str.replace(/^\s+|\s+$/g, "");
   }
 
   export function unescapeXML(str) {
     return str.replace(/(&(?:lt|gt|amp|apos|quot|#(?:\d{1,6}|x[0-9a-fA-F]{1,5}));)/g, function(str) {
       if (str[1] === "#") {
         var code = (str[2] === "x") ? parseInt(str.substr(3), 16) : parseInt(str.substr(2), 10);
         if (code > -1) return String.fromCharCode(code);
       }
       return UNESCAPE[str] || str;
     });
   }
 
   function toObject(elem, reviver) {
     if ("string" === typeof elem) return elem;
 
     var raw = elem.r;
     if (raw) return raw;
 
     var attributes = parseAttribute(elem, reviver);
     var object;
     var childList = elem.f;
     var childLength = childList.length;
 
     if (attributes || childLength > 1) {
       // merge attributes and child nodes
       object = attributes || {};
       childList.forEach(function(child) {
         if ("string" === typeof child) {
           addObject(object, CHILD_NODE_KEY, child);
         } else {
           addObject(object, child.n, toObject(child, reviver));
         }
       });
     } else if (childLength) {
       // the node has single child node but no attribute
       var child = childList[0];
       object = toObject(child, reviver);
       if (child.n) {
         var wrap = {};
         wrap[child.n] = object;
         object = wrap;
       }
     } else {
       // the node has no attribute nor child node
       object = elem.c ? null : "";
     }
 
     if (reviver) {
       object = reviver(elem.n || "", object);
     }
 
     return object;
   }
 
   function addObject(object, key, val) {
     if ("undefined" === typeof val) return;
     var prev = object[key];
     if (prev instanceof Array) {
       prev.push(val);
     } else if (key in object) {
       object[key] = [prev, val];
     } else {
       object[key] = val;
     }
   }
 })(typeof exports === "object" && exports || {});*/

const UNESCAPE = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&apos;": "'",
  "&quot;": '"'
};

const ATTRIBUTE_KEY = "@";
const CHILD_NODE_KEY = "#";

function parseXML(text) {
  let list = String.prototype.split.call(text, /<([^!<>?](?:'[\S\s]*?'|"[\S\s]*?"|[^'"<>])*|!(?:--[\S\s]*?--|\[[^\[\]'"<>]+\[[\S\s]*?]]|DOCTYPE[^\[<>]*?\[[\S\s]*?]|(?:ENTITY[^"<>]*?"[\S\s]*?")?[\S\s]*?)|\?[\S\s]*?\?)>/);
  let length = list.length;

  // root element
  let root = { f: [] };
  let elem = root;

  // dom tree stack
  let stack = [];

  for (let i = 0; i < length;) {
    // text node
    let str = list[i++];
    if (str) appendText(str);

    // child node
    let tag = list[i++];
    if (tag) parseNode(tag);
  }

  return root;

  function parseNode(tag) {
    let tagLength = tag.length;
    let firstChar = tag[0];
    if (firstChar === "/") {
      // close tag
      let closed = tag.replace(/^\/|[\s\/].*$/g, "").toLowerCase();
      while (stack.length) {
        let tagName = elem.n && elem.n.toLowerCase();
        elem = stack.pop();
        if (tagName === closed) break;
      }
    } else if (firstChar === "?") {
      // XML declaration
      appendChild({ n: "?", r: tag.substr(1, tagLength - 2) });
    } else if (firstChar === "!") {
      if (tag.substr(1, 7) === "[CDATA[" && tag.substr(-2) === "]]") {
        // CDATA section
        appendText(tag.substr(8, tagLength - 10));
      } else {
        // comment
        appendChild({ n: "!", r: tag.substr(1) });
      }
    } else {
      let child = openTag(tag);
      appendChild(child);
      if (tag[tagLength - 1] === "/") {
        child.c = 1; // emptyTag
      } else {
        stack.push(elem); // openTag
        elem = child;
      }
    }
  }

  function appendChild(child) {
    elem.f.push(child);
  }

  function appendText(str) {
    str = removeSpaces(str);
    if (str) appendChild(unescapeXML(str));
  }
}

function openTag(tag) {
  let elem = { f: [] };
  tag = tag.replace(/\s*\/?$/, "");
  let pos = tag.search(/[\s='"\/]/);
  if (pos < 0) {
    elem.n = tag;
  } else {
    elem.n = tag.substr(0, pos);
    elem.t = tag.substr(pos);
  }
  return elem;
}

function parseAttribute(elem, reviver) {
  if (!elem.t) return;
  let list = elem.t.split(/([^\s='"]+(?:\s*=\s*(?:'[\S\s]*?'|"[\S\s]*?"|[^\s'"]*))?)/);
  let length = list.length;
  let attributes, val;

  for (let i = 0; i < length; i++) {
    let str = removeSpaces(list[i]);
    if (!str) continue;

    if (!attributes) {
      attributes = {};
    }

    let pos = str.indexOf("=");
    if (pos < 0) {
      // bare attribute
      str = ATTRIBUTE_KEY + str;
      val = null;
    } else {
      // attribute key/value pair
      val = str.substr(pos + 1).replace(/^\s+/, "");
      str = ATTRIBUTE_KEY + str.substr(0, pos).replace(/\s+$/, "");

      // quote: foo="FOO" bar='BAR'
      let firstChar = val[0];
      let lastChar = val[val.length - 1];
      if (firstChar === lastChar && (firstChar === "'" || firstChar === '"')) {
        val = val.substr(1, val.length - 2);
      }

      val = unescapeXML(val);
    }
    if (reviver) {
      val = reviver(str, val);
    }
    addObject(attributes, str, val);
  }

  return attributes;
}

function removeSpaces(str) {
  return str && str.replace(/^\s+|\s+$/g, "");
}

function unescapeXML(str) {
  return str.replace(/(&(?:lt|gt|amp|apos|quot|#(?:\d{1,6}|x[0-9a-fA-F]{1,5}));)/g, function (str) {
    if (str[1] === "#") {
      let code = (str[2] === "x") ? parseInt(str.substr(3), 16) : parseInt(str.substr(2), 10);
      if (code > -1) return String.fromCharCode(code);
    }
    return UNESCAPE[str] || str;
  });
}

export function fromXML(text, reviver) {
  return toObject(parseXML(text), reviver);
}

function toObject(elem, reviver) {
  if ("string" === typeof elem) return elem;

  let raw = elem.r;
  if (raw) return raw;

  let attributes = parseAttribute(elem, reviver);
  let object;
  let childList = elem.f;
  let childLength = childList.length;

  if (attributes || childLength > 1) {
    // merge attributes and child nodes
    object = attributes || {};
    childList.forEach(function (child) {
      if ("string" === typeof child) {
        addObject(object, CHILD_NODE_KEY, child);
      } else {
        addObject(object, child.n, toObject(child, reviver));
      }
    });
  } else if (childLength) {
    // the node has single child node but no attribute
    let child = childList[0];
    object = toObject(child, reviver);
    if (child.n) {
      let wrap = {};
      wrap[child.n] = object;
      object = wrap;
    }
  } else {
    // the node has no attribute nor child node
    object = elem.c ? null : "";
  }

  if (reviver) {
    object = reviver(elem.n || "", object);
  }

  return object;
}

function addObject(object, key, val) {
  if ("undefined" === typeof val) return;
  let prev = object[key];
  if (prev instanceof Array) {
    prev.push(val);
  } else if (key in object) {
    object[key] = [prev, val];
  } else {
    object[key] = val;
  }
}

 