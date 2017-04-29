//     Underscore.js 1.7.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
((function(...args) {
  var n=this;
  var t=n._;
  var r=Array.prototype;
  var e=Object.prototype;
  var u=Function.prototype;
  var i=r.push;
  var a=r.slice;
  var o=r.concat;
  var l=e.toString;
  var c=e.hasOwnProperty;
  var f=Array.isArray;
  var s=Object.keys;
  var p=u.bind;
  var h=function(n){return n instanceof h?n:this instanceof h?void(this._wrapped=n):new h(n)};
  "undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=h),exports._=h):n._=h,h.VERSION="1.7.0";var g=(n, t, r) => {if(t===void 0)return n;switch(null==r?3:r){case 1:return r => n.call(t,r);case 2:return (r, e) => n.call(t,r,e);case 3:return (r, e, u) => n.call(t,r,e,u);case 4:return (r, e, u, i) => n.call(t,r,e,u,i);}return function(...args) {return n.apply(t,args);};};h.iteratee=(n, t, r) => null==n?h.identity:h.isFunction(n)?g(n,t,r):h.isObject(n)?h.matches(n):h.property(n),h.each=h.forEach=(n, t, r) => {
    if(null==n)return n;t=g(t,r);
    var e;
    var u=n.length;
    if(u===+u)for(e=0;u>e;e++)t(n[e],e,n);else{var i=h.keys(n);for(e=0,u=i.length;u>e;e++)t(n[i[e]],i[e],n)}return n
  },h.map=h.collect=(n, t, r) => {if(null==n)return[];t=h.iteratee(t,r);for(var e,u=n.length!==+n.length&&h.keys(n),i=(u||n).length,a=Array(i),o=0;i>o;o++)e=u?u[o]:o,a[o]=t(n[e],e,n);return a};var v="Reduce of empty array with no initial value";h.reduce=h.foldl=h.inject=function(n,t,r,e){
    null==n&&(n=[]),t=g(t,e,4);
    var u;
    var i=n.length!==+n.length&&h.keys(n);
    var a=(i||n).length;
    var o=0;
    if(arguments.length<3){if(!a)throw new TypeError(v);r=n[i?i[o++]:o++]}for(;a>o;o++)u=i?i[o]:o,r=t(r,n[u],u,n);return r
  },h.reduceRight=h.foldr=function(n,t,r,e){
    null==n&&(n=[]),t=g(t,e,4);
    var u;
    var i=n.length!==+n.length&&h.keys(n);
    var a=(i||n).length;
    if(arguments.length<3){if(!a)throw new TypeError(v);r=n[i?i[--a]:--a]}for(;a--;)u=i?i[a]:a,r=t(r,n[u],u,n);return r
  },h.find=h.detect=(n, t, r) => {var e;return t=h.iteratee(t,r),h.some(n,(n, r, u) => t(n,r,u)?(e=n,!0):void 0),e;},h.filter=h.select=(n, t, r) => {var e=[];return null==n?e:(t=h.iteratee(t,r),h.each(n,(n, r, u) => {t(n,r,u)&&e.push(n)}),e);},h.reject=(n, t, r) => h.filter(n,h.negate(h.iteratee(t)),r),h.every=h.all=(n, t, r) => {
    if(null==n)return!0;t=h.iteratee(t,r);
    var e;
    var u;
    var i=n.length!==+n.length&&h.keys(n);
    var a=(i||n).length;
    for(e=0;a>e;e++)if(u=i?i[e]:e,!t(n[u],u,n))return!1;return!0
  },h.some=h.any=(n, t, r) => {
    if(null==n)return!1;t=h.iteratee(t,r);
    var e;
    var u;
    var i=n.length!==+n.length&&h.keys(n);
    var a=(i||n).length;
    for(e=0;a>e;e++)if(u=i?i[e]:e,t(n[u],u,n))return!0;return!1
  },h.contains=h.include=(n, t) => null==n?!1:(n.length!==+n.length&&(n=h.values(n)),h.indexOf(n,t)>=0),h.invoke=function(n,t){
    var r=a.call(arguments,2);
    var e=h.isFunction(t);
    return h.map(n,n => (e?t:n[t]).apply(n,r));
  },h.pluck=(n, t) => h.map(n,h.property(t)),h.where=(n, t) => h.filter(n,h.matches(t)),h.findWhere=(n, t) => h.find(n,h.matches(t)),h.max=(n, t, r) => {
    var e;
    var u;
    var i=-1/0;
    var a=-1/0;
    if(null==t&&null!=n){n=n.length===+n.length?n:h.values(n);for(var o=0,l=n.length;l>o;o++)e=n[o],e>i&&(i=e)}else t=h.iteratee(t,r),h.each(n,(n, r, e) => {u=t(n,r,e),(u>a||u===-1/0&&i===-1/0)&&(i=n,a=u)});return i
  },h.min=(n, t, r) => {
    var e;
    var u;
    var i=1/0;
    var a=1/0;
    if(null==t&&null!=n){n=n.length===+n.length?n:h.values(n);for(var o=0,l=n.length;l>o;o++)e=n[o],i>e&&(i=e)}else t=h.iteratee(t,r),h.each(n,(n, r, e) => {u=t(n,r,e),(a>u||1/0===u&&1/0===i)&&(i=n,a=u)});return i
  },h.shuffle=n => {for(var t,r=n&&n.length===+n.length?n:h.values(n),e=r.length,u=Array(e),i=0;e>i;i++)t=h.random(0,i),t!==i&&(u[i]=u[t]),u[t]=r[i];return u},h.sample=(n, t, r) => null==t||r?(n.length!==+n.length&&(n=h.values(n)),n[h.random(n.length-1)]):h.shuffle(n).slice(0,Math.max(0,t)),h.sortBy=(n, t, r) => (t=h.iteratee(t,r), h.pluck(h.map(n,(n, r, e) => ({
    value:n,
    index:r,
    criteria:t(n,r,e)
  })).sort((n, t) => {
    var r=n.criteria;
    var e=t.criteria;
    if(r!==e){if(r>e||r===void 0)return 1;if(e>r||e===void 0)return-1}return n.index-t.index
  }),"value"));var m=n => (t, r, e) => {var u={};return r=h.iteratee(r,e),h.each(t,(e, i) => {var a=r(e,i,t);n(u,e,a)}),u;};h.groupBy=m((n, t, r) => {h.has(n,r)?n[r].push(t):n[r]=[t]}),h.indexBy=m((n, t, r) => {n[r]=t}),h.countBy=m((n, t, r) => {h.has(n,r)?n[r]++:n[r]=1}),h.sortedIndex=(n, t, r, e) => {r=h.iteratee(r,e,1);for(var u=r(t),i=0,a=n.length;a>i;){var o=i+a>>>1;r(n[o])<u?i=o+1:a=o}return i},h.toArray=n => n?h.isArray(n)?a.call(n):n.length===+n.length?h.map(n,h.identity):h.values(n):[],h.size=n => null==n?0:n.length===+n.length?n.length:h.keys(n).length,h.partition=(n, t, r) => {
    t=h.iteratee(t,r);
    var e=[];
    var u=[];
    return h.each(n,(n, r, i) => {(t(n,r,i)?e:u).push(n)}),[e,u];
  },h.first=h.head=h.take=(n, t, r) => null==n?void 0:null==t||r?n[0]:0>t?[]:a.call(n,0,t),h.initial=(n, t, r) => a.call(n,0,Math.max(0,n.length-(null==t||r?1:t))),h.last=(n, t, r) => null==n?void 0:null==t||r?n[n.length-1]:a.call(n,Math.max(n.length-t,0)),h.rest=h.tail=h.drop=(n, t, r) => a.call(n,null==t||r?1:t),h.compact=n => h.filter(n,h.identity);var y=(n, t, r, e) => {if(t&&h.every(n,h.isArray))return o.apply(e,n);for(var u=0,a=n.length;a>u;u++){var l=n[u];h.isArray(l)||h.isArguments(l)?t?i.apply(e,l):y(l,t,r,e):r||e.push(l)}return e};h.flatten=(n, t) => y(n,t,!1,[]),h.without=function(n){return h.difference(n,a.call(arguments,1))},h.uniq=h.unique=(n, t, r, e) => {if(null==n)return[];h.isBoolean(t)||(e=r,r=t,t=!1),null!=r&&(r=h.iteratee(r,e));for(var u=[],i=[],a=0,o=n.length;o>a;a++){var l=n[a];if(t)a&&i===l||u.push(l),i=l;else if(r){var c=r(l,a,n);h.indexOf(i,c)<0&&(i.push(c),u.push(l))}else h.indexOf(u,l)<0&&u.push(l)}return u},h.union=function(...args) {return h.uniq(y(args,!0,!0,[]));},h.intersection=function(n){if(null==n)return[];for(var t=[],r=arguments.length,e=0,u=n.length;u>e;e++){var i=n[e];if(!h.contains(t,i)){for(var a=1;r>a&&h.contains(arguments[a],i);a++);a===r&&t.push(i)}}return t},h.difference=function(n){var t=y(a.call(arguments,1),!0,!0,[]);return h.filter(n,n => !h.contains(t,n));},h.zip=function(n){if(null==n)return[];for(var t=h.max(arguments,"length").length,r=Array(t),e=0;t>e;e++)r[e]=h.pluck(arguments,e);return r},h.object=(n, t) => {if(null==n)return{};for(var r={},e=0,u=n.length;u>e;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},h.indexOf=(n, t, r) => {
    if(null==n)return-1;
    var e=0;
    var u=n.length;
    if(r){if("number"!=typeof r)return e=h.sortedIndex(n,t),n[e]===t?e:-1;e=0>r?Math.max(0,u+r):r}for(;u>e;e++)if(n[e]===t)return e;return-1
  },h.lastIndexOf=(n, t, r) => {if(null==n)return-1;var e=n.length;for("number"==typeof r&&(e=0>r?e+r+1:Math.min(e,r+1));--e>=0;)if(n[e]===t)return e;return-1},h.range=function(n,t,r){arguments.length<=1&&(t=n||0,n=0),r=r||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=Array(e),i=0;e>i;i++,n+=r)u[i]=n;return u};var d=() => {};h.bind=function(n,t){
    var r;
    var e;
    if(p&&n.bind===p)return p.apply(n,a.call(arguments,1));if(!h.isFunction(n))throw new TypeError("Bind must be called on a function");return r=a.call(arguments,2),e=function(...args) {if(!(this instanceof e))return n.apply(t,r.concat(a.call(args)));d.prototype=n.prototype;var u=new d;d.prototype=null;var i=n.apply(u,r.concat(a.call(args)));return h.isObject(i)?i:u};
  },h.partial=function(n){var t=a.call(arguments,1);return function(...args) {for(var r=0,e=t.slice(),u=0,i=e.length;i>u;u++)e[u]===h&&(e[u]=args[r++]);for(;r<args.length;)e.push(args[r++]);return n.apply(this,e)};},h.bindAll=function(n){
    var t;
    var r;
    var e=arguments.length;
    if(1>=e)throw new Error("bindAll must be passed function names");for(t=1;e>t;t++)r=arguments[t],n[r]=h.bind(n[r],n);return n
  },h.memoize=(n, t) => {var r=function(e){
    var u=r.cache;
    var i=t?t.apply(this,arguments):e;
    return h.has(u,i)||(u[i]=n.apply(this,arguments)),u[i]
  };return r.cache={},r},h.delay=function(n,t){var r=a.call(arguments,2);return setTimeout(() => n(...r),t);},h.defer=function(n){return h.delay(...[n,1].concat(a.call(arguments,1)));},h.throttle=(n, t, r) => {
    var e;
    var u;
    var i;
    var a=null;
    var o=0;
    r||(r={});var l=() => {o=r.leading===!1?0:h.now(),a=null,i=n.apply(e,u),a||(e=u=null)};return function(...args) {var c=h.now();o||r.leading!==!1||(o=c);var f=t-(c-o);return e=this,u=args,0>=f||f>t?(clearTimeout(a),a=null,o=c,i=n.apply(e,u),a||(e=u=null)):a||r.trailing===!1||(a=setTimeout(l,f)),i;};
  },h.debounce=(n, t, r) => {
    var e;
    var u;
    var i;
    var a;
    var o;
    var l=() => {var c=h.now()-a;t>c&&c>0?e=setTimeout(l,t-c):(e=null,r||(o=n.apply(i,u),e||(i=u=null)))};
    return function(...args) {i=this,u=args,a=h.now();var c=r&&!e;return e||(e=setTimeout(l,t)),c&&(o=n.apply(i,u),i=u=null),o};
  },h.wrap=(n, t) => h.partial(t,n),h.negate=n => function(...args) {return !n.apply(this,args);},h.compose=function(...args) {
    var n=args;
    var t=n.length-1;
    return function(...args) {for(var r=t,e=n[t].apply(this,args);r--;)e=n[r].call(this,e);return e};
  },h.after=(n, t) => function(...args) {return --n<1?t.apply(this,args):void 0;},h.before=(n, t) => {var r;return function(...args) {return --n>0?r=t.apply(this,args):t=null,r;};},h.once=h.partial(h.before,2),h.keys=n => {if(!h.isObject(n))return[];if(s)return s(n);var t=[];for(var r in n)h.has(n,r)&&t.push(r);return t},h.values=n => {for(var t=h.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=n[t[u]];return e},h.pairs=n => {for(var t=h.keys(n),r=t.length,e=Array(r),u=0;r>u;u++)e[u]=[t[u],n[t[u]]];return e},h.invert=n => {for(var t={},r=h.keys(n),e=0,u=r.length;u>e;e++)t[n[r[e]]]=r[e];return t},h.functions=h.methods=n => {var t=[];for(var r in n)h.isFunction(n[r])&&t.push(r);return t.sort()},h.extend=function(n){if(!h.isObject(n))return n;for(var t,r,e=1,u=arguments.length;u>e;e++){t=arguments[e];for(r in t)c.call(t,r)&&(n[r]=t[r])}return n},h.pick=function(n,t,r){
    var e;
    var u={};
    if(null==n)return u;if(h.isFunction(t)){t=g(t,r);for(e in n){var i=n[e];t(i,e,n)&&(u[e]=i)}}else{var l=o.apply([],a.call(arguments,1));n=new Object(n);for(var c=0,f=l.length;f>c;c++)e=l[c],e in n&&(u[e]=n[e])}return u
  },h.omit=function(n,t,r){if(h.isFunction(t))t=h.negate(t);else{var e=h.map(o.apply([],a.call(arguments,1)),String);t=(n, t) => !h.contains(e,t)}return h.pick(n,t,r)},h.defaults=function(n){if(!h.isObject(n))return n;for(var t=1,r=arguments.length;r>t;t++){var e=arguments[t];for(var u in e)n[u]===void 0&&(n[u]=e[u])}return n},h.clone=n => h.isObject(n)?h.isArray(n)?n.slice():h.extend({},n):n,h.tap=(n, t) => (t(n), n);var b=(n, t, r, e) => {
    if(n===t)return 0!==n||1/n===1/t;if(null==n||null==t)return n===t;n instanceof h&&(n=n._wrapped),t instanceof h&&(t=t._wrapped);var u=l.call(n);if(u!==l.call(t))return!1;switch(u){case"[object RegExp]":case"[object String]":return""+n==""+t;case"[object Number]":return+n!==+n?+t!==+t:0===+n?1/+n===1/t:+n===+t;case"[object Date]":case"[object Boolean]":return+n===+t}if("object"!=typeof n||"object"!=typeof t)return!1;for(var i=r.length;i--;)if(r[i]===n)return e[i]===t;
    var a=n.constructor;
    var o=t.constructor;
    if(a!==o&&"constructor"in n&&"constructor"in t&&!(h.isFunction(a)&&a instanceof a&&h.isFunction(o)&&o instanceof o))return!1;r.push(n),e.push(t);
    var c;
    var f;
    if("[object Array]"===u){if(c=n.length,f=c===t.length)for(;c--&&(f=b(n[c],t[c],r,e)););}else{
      var s;
      var p=h.keys(n);
      if(c=p.length,f=h.keys(t).length===c)for(;c--&&(s=p[c],f=h.has(t,s)&&b(n[s],t[s],r,e)););
    }return r.pop(),e.pop(),f
  };h.isEqual=(n, t) => b(n,t,[],[]),h.isEmpty=n => {if(null==n)return!0;if(h.isArray(n)||h.isString(n)||h.isArguments(n))return 0===n.length;for(var t in n)if(h.has(n,t))return!1;return!0},h.isElement=n => !(!n||1!==n.nodeType),h.isArray=f||(n => "[object Array]"===l.call(n)),h.isObject=n => {var t=typeof n;return"function"===t||"object"===t&&!!n},h.each(["Arguments","Function","String","Number","Date","RegExp"],n => {h["is"+n]=t => l.call(t)==="[object "+n+"]"}),h.isArguments(args)||(h.isArguments=n => h.has(n,"callee")),"function"!=typeof/./&&(h.isFunction=n => "function"==typeof n||!1),h.isFinite=n => isFinite(n)&&!isNaN(parseFloat(n)),h.isNaN=n => h.isNumber(n)&&n!==+n,h.isBoolean=n => n===!0||n===!1||"[object Boolean]"===l.call(n),h.isNull=n => null===n,h.isUndefined=n => n===void 0,h.has=(n, t) => null!=n&&c.call(n,t),h.noConflict=function(){return n._=t,this},h.identity=n => n,h.constant=n => () => n,h.noop=() => {},h.property=n => t => t[n],h.matches=n => {
    var t=h.pairs(n);
    var r=t.length;
    return n => {if(null==n)return!r;n=new Object(n);for(var e=0;r>e;e++){
      var u=t[e];
      var i=u[0];
      if(u[1]!==n[i]||!(i in n))return!1
    }return!0};
  },h.times=(n, t, r) => {var e=Array(Math.max(0,n));t=g(t,r,1);for(var u=0;n>u;u++)e[u]=t(u);return e},h.random=(n, t) => (null==t&&(t=n,n=0), n+Math.floor(Math.random()*(t-n+1))),h.now=Date.now||(() => (new Date).getTime());
  var _={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"};
  var w=h.invert(_);
  var j=n => {var t=t => n[t],r="(?:"+h.keys(n).join("|")+")",e=RegExp(r),u=RegExp(r,"g");return n => (n=null==n?"":""+n, e.test(n)?n.replace(u,t):n);};
  h.escape=j(_),h.unescape=j(w),h.result=(n, t) => {if(null==n)return void 0;var r=n[t];return h.isFunction(r)?n[t]():r};var x=0;h.uniqueId=n => {var t=++x+"";return n?n+t:t},h.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};
  var A=/(.)^/;
  var k={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"};
  var O=/\\|'|\r|\n|\u2028|\u2029/g;
  var F=n => "\\"+k[n];
  h.template=(n, t, r) => {
    !t&&r&&(t=r),t=h.defaults({},t,h.templateSettings);
    var e=RegExp([(t.escape||A).source,(t.interpolate||A).source,(t.evaluate||A).source].join("|")+"|$","g");
    var u=0;
    var i="__p+='";
    n.replace(e,(t, r, e, a, o) => (i+=n.slice(u,o).replace(O,F), u=o+t.length, r?i+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'":e?i+="'+\n((__t=("+e+"))==null?'':__t)+\n'":a&&(i+="';\n"+a+"\n__p+='"), t)),i+="';\n",t.variable||(i="with(obj||{}){\n"+i+"}\n"),i="var __t,__p='',__j=Array.prototype.join,"+"print=function(){__p+=__j.call(arguments,'');};\n"+i+"return __p;\n";try{var a=new Function(t.variable||"obj","_",i)}catch(o){throw (o.source=i, o)}
    var l=function(n){return a.call(this,n,h)};
    var c=t.variable||"obj";
    return l.source="function("+c+"){\n"+i+"}",l
  },h.chain=n => {var t=h(n);return t._chain=!0,t};var E=function(n){return this._chain?h(n).chain():n};h.mixin=n => {h.each(h.functions(n),t => {var r=h[t]=n[t];h.prototype[t]=function(...args) {var n=[this._wrapped];return i.apply(n,args),E.call(this,r.apply(h,n));}})},h.mixin(h),h.each(["pop","push","reverse","shift","sort","splice","unshift"],n => {var t=r[n];h.prototype[n]=function(...args) {var r=this._wrapped;return t.apply(r,args),"shift"!==n&&"splice"!==n||0!==r.length||delete r[0],E.call(this,r);}}),h.each(["concat","join","slice"],n => {var t=r[n];h.prototype[n]=function(...args) {return E.call(this,t.apply(this._wrapped,args));}}),h.prototype.value=function(){return this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],() => h)
})).call(this);
//# sourceMappingURL=underscore-min.map
