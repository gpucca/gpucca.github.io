
// <![CDATA[
/*
https://sites.google.com/site/bloggertricksandtoolz/snowstormeffectbywww.bloggertricksandtoolz.com.js
   DHTML Snowstorm! OO-style Jascript-based Snow effect
   ----------------------------------------------------
   Version 1.4.20091115 (Previous rev: v1.3.20081215)
   Code by Scott Schiller - http://schillmania.com
   ----------------------------------------------------
  
   Initializes after body onload() by default (via addEventHandler() call at bottom.)
   To customize properties, edit below or override configuration after this script
   has run (but before body.onload), eg. snowStorm.snowStick = false;

   */

   var snowStorm = null;

   function SnowStorm() {

  // --- PROPERTIES ---

  this.flakesMax = 128;           // Limit total amount of snow made (falling + sticking)
  this.flakesMaxActive = 64;      // Limit amount of snow falling at once (less = lower CPU use)
  this.animationInterval = 33;    // Theoretical "miliseconds per frame" measurement. 20 = fast + smooth, but high CPU use. 50 = more conservative, but slower
  this.flakeBottom = null;        // Integer for Y axis snow limit, 0 or null for "full-screen" snow effect
  this.targetElement = null;      // element which snow will be appended to (document body if null/undefined) - can be an element ID string, or a DOM node reference
  this.followMouse = true;        // Snow will change movement with the user's mouse
  this.snowColor = '#fff';        // Don't eat (or use?) yellow snow.
  this.snowCharacter = '&bull;';  // &bull; = bullet, &middot; is square on some systems etc.
  this.snowStick = true;          // Whether or not snow should "stick" at the bottom. When off, will never collect.
  this.useMeltEffect = true;      // When recycling fallen snow (or rarely, when falling), have it "melt" and fade out if browser supports it
  this.useTwinkleEffect = false;  // Allow snow to randomly "flicker" in and out of view while falling
  this.usePositionFixed = false;  // true = snow not affected by window scroll. may increase CPU load, disabled by default - if enabled, used only where supported

  var random = Math.floor(Math.random() * 10) + 1;
  if(random == 1){
    this.snowColor = '#00ff00'
  }else if(random == 2){
    this.snowColor = '#ff00bf'
  }else if(random == 3){
    this.snowColor = '#8000ff'
  }else if(random == 4){
    this.snowColor = '#0000ff'
  }else if(random == 5){
    this.snowColor = '#00ffff'
  }else if(random == 6){
    this.snowColor = '#000000'
  }else if(random == 7){
    this.snowColor = '#ffff00'
  }else if(random == 8){
    this.snowColor = '#ff8000'
  }else if(random == 9){
    this.snowColor = 'ff0000'
  }else if(random == 10){
    this.snowColor = '#ffffff'
  }
  // --- less-used bits ---

  this.flakeLeftOffset = 0;       // amount to subtract from edges of container
  this.flakeRightOffset = 0;      // amount to subtract from edges of container
  this.flakeWidth = 8;            // max pixel width for snow element
  this.flakeHeight = 8;           // max pixel height for snow element
  this.vMaxX = 5;                 // Maximum X velocity range for snow
  this.vMaxY = 4;                 // Maximum Y velocity range
  this.zIndex = 0;                // CSS stacking order applied to each snowflake

  // --- End of user section ---

  // jslint global declarations
  /*global window, document, navigator, clearInterval, setInterval */

  var addEvent = (typeof(window.attachEvent)=='undefined'?function(o,evtName,evtHandler) {
   return o.addEventListener(evtName,evtHandler,false);
 }:function(o,evtName,evtHandler) {
   return o.attachEvent('on'+evtName,evtHandler);
 });

  var removeEvent = (typeof(window.attachEvent)=='undefined'?function(o,evtName,evtHandler) {
    return o.removeEventListener(evtName,evtHandler,false);
  }:function(o,evtName,evtHandler) {
   return o.detachEvent('on'+evtName,evtHandler);
 });

  function rnd(n,min) {
    if (isNaN(min)) {
     min = 0;
   }
   return (Math.random()*n)+min;
 }

 function plusMinus(n) {
  return (parseInt(rnd(2),10)==1?n*-1:n);
}

var s = this;
var storm = this;
this.timers = [];
this.flakes = [];
this.disabled = false;
this.active = false;

var isIE = navigator.userAgent.match(/msie/i);
var isIE6 = navigator.userAgent.match(/msie 6/i);
var isOldIE = (isIE && (isIE6 || navigator.userAgent.match(/msie 5/i)));
var isWin9X = navigator.appVersion.match(/windows 98/i);
var isiPhone = navigator.userAgent.match(/iphone/i);
var isBackCompatIE = (isIE && document.compatMode == 'BackCompat');
var noFixed = ((isBackCompatIE || isIE6 || isiPhone)?true:false);
var screenX = null;
var screenX2 = null;
var screenY = null;
var scrollY = null;
var vRndX = null;
var vRndY = null;
var windOffset = 1;
var windMultiplier = 2;
var flakeTypes = 6;
var fixedForEverything = false;
var opacitySupported = (function(){
  try {
   document.createElement('div').style.opacity = '0.5';
 } catch (e) {
   return false;
 }
 return true;
})();
var docFrag = document.createDocumentFragment();
if (s.flakeLeftOffset === null) {
 s.flakeLeftOffset = 0;
}
if (s.flakeRightOffset === null) {
 s.flakeRightOffset = 0;
}

this.meltFrameCount = 20;
this.meltFrames = [];
for (var i=0; i<this.meltFrameCount; i++) {
 this.meltFrames.push(1-(i/this.meltFrameCount));
}

this.randomizeWind = function() {
  vRndX = plusMinus(rnd(s.vMaxX,0.2));
  vRndY = rnd(s.vMaxY,0.2);
  if (this.flakes) {
    for (var i=0; i<this.flakes.length; i++) {
      if (this.flakes[i].active) {
        this.flakes[i].setVelocities();
      }
    }
  }
};

this.scrollHandler = function() {
    // "attach" snowflakes to bottom of window if no absolute bottom value was given
    scrollY = (s.flakeBottom?0:parseInt(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop,10));
    if (isNaN(scrollY)) {
   scrollY = 0; // Netscape 6 scroll fix
 }
 if (!fixedForEverything && !s.flakeBottom && s.flakes) {
  for (var i=s.flakes.length; i--;) {
    if (s.flakes[i].active === 0) {
     s.flakes[i].stick();
   }
 }
}
};

this.resizeHandler = function() {
  if (window.innerWidth || window.innerHeight) {
    screenX = window.innerWidth-(!isIE?16:2)-s.flakeRightOffset;
    screenY = (s.flakeBottom?s.flakeBottom:window.innerHeight);
  } else {
    screenX = (document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth)-(!isIE?8:0)-s.flakeRightOffset;
    screenY = s.flakeBottom?s.flakeBottom:(document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight);
  }
  screenX2 = parseInt(screenX/2,10);
};

this.resizeHandlerAlt = function() {
  screenX = s.targetElement.offsetLeft+s.targetElement.offsetWidth-s.flakeRightOffset;
  screenY = s.flakeBottom?s.flakeBottom:s.targetElement.offsetTop+s.targetElement.offsetHeight;
  screenX2 = parseInt(screenX/2,10);
};

this.freeze = function() {
    // pause animation
    if (!s.disabled) {
      s.disabled = 1;
    } else {
      return false;
    }
    for (var i=s.timers.length; i--;) {
      clearInterval(s.timers[i]);
    }
  };

  this.resume = function() {
    if (s.disabled) {
     s.disabled = 0;
   } else {
    return false;
  }
  s.timerInit();
};

this.toggleSnow = function() {
  if (!s.flakes.length) {
      // first run
      s.start();
    } else {
      s.active = !s.active;
      if (s.active) {
        s.show();
        s.resume();
      } else {
        s.stop();
        s.freeze();
      }
    }
  };

  this.stop = function() {
    this.freeze();
    for (var i=this.flakes.length; i--;) {
      this.flakes[i].o.style.display = 'none';
    }
    removeEvent(window,'scroll',s.scrollHandler);
    removeEvent(window,'resize',s.resizeHandler);
    if (!isOldIE) {
      removeEvent(window,'blur',s.freeze);
      removeEvent(window,'focus',s.resume);
    }
  };

  this.show = function() {
    for (var i=this.flakes.length; i--;) {
      this.flakes[i].o.style.display = 'block';
    }
  };

  this.SnowFlake = function(parent,type,x,y) {
    var s = this;
    var storm = parent;
    this.type = type;
    this.x = x||parseInt(rnd(screenX-20),10);
    this.y = (!isNaN(y)?y:-rnd(screenY)-12);
    this.vX = null;
    this.vY = null;
    this.vAmpTypes = [1,1.2,1.4,1.6,1.8]; // "amplification" for vX/vY (based on flake size/type)
    this.vAmp = this.vAmpTypes[this.type];
    this.melting = false;
    this.meltFrameCount = storm.meltFrameCount;
    this.meltFrames = storm.meltFrames;
    this.meltFrame = 0;
    this.twinkleFrame = 0;
    this.active = 1;
    this.fontSize = (10+(this.type/5)*10);
    this.o = document.createElement('div');
    this.o.innerHTML = storm.snowCharacter;
    this.o.style.color = storm.snowColor;
    this.o.style.position = (fixedForEverything?'fixed':'absolute');
    this.o.style.width = storm.flakeWidth+'px';
    this.o.style.height = storm.flakeHeight+'px';
    this.o.style.fontFamily = 'arial,verdana';
    this.o.style.overflow = 'hidden';
    this.o.style.fontWeight = 'normal';
    this.o.style.zIndex = storm.zIndex;
    docFrag.appendChild(this.o);

    this.refresh = function() {
     if (isNaN(s.x) || isNaN(s.y)) {
  // safety check
  return false;
}
s.o.style.left = s.x+'px';
s.o.style.top = s.y+'px';
};

this.stick = function() {
  if (noFixed || (storm.targetElement != document.documentElement && storm.targetElement != document.body)) {
    s.o.style.top = (screenY+scrollY-storm.flakeHeight)+'px';
  } else if (storm.flakeBottom) {
   s.o.style.top = storm.flakeBottom+'px';
 } else {
  s.o.style.display = 'none';
  s.o.style.top = 'auto';
  s.o.style.bottom = '0px';
  s.o.style.position = 'fixed';
  s.o.style.display = 'block';
}
};

this.vCheck = function() {
  if (s.vX>=0 && s.vX<0.2) {
    s.vX = 0.2;
  } else if (s.vX<0 && s.vX>-0.2) {
    s.vX = -0.2;
  }
  if (s.vY>=0 && s.vY<0.2) {
    s.vY = 0.2;
  }
};

this.move = function() {
  var vX = s.vX*windOffset;
  s.x += vX;
  s.y += (s.vY*s.vAmp);
      if (s.x >= screenX || screenX-s.x < storm.flakeWidth) { // X-axis scroll check
        s.x = 0;
      } else if (vX < 0 && s.x-storm.flakeLeftOffset<0-storm.flakeWidth) {
        s.x = screenX-storm.flakeWidth-1; // flakeWidth;
      }
      s.refresh();
      var yDiff = screenY+scrollY-s.y;
      if (yDiff<storm.flakeHeight) {
        s.active = 0;
        if (storm.snowStick) {
          s.stick();
        } else {
         s.recycle();
       }
     } else {
       if (storm.useMeltEffect && s.active && s.type < 3 && !s.melting && Math.random()>0.998) {
       // ~1/1000 chance of melting mid-air, with each frame
       s.melting = true;
       s.melt();
       // only incrementally melt one frame
       // s.melting = false;
     }
     if (storm.useTwinkleEffect) {
      if (!s.twinkleFrame) {
       if (Math.random()>0.9) {
        s.twinkleFrame = parseInt(Math.random()*20,10);
      }
    } else {
     s.twinkleFrame--;
     s.o.style.visibility = (s.twinkleFrame && s.twinkleFrame%2===0?'hidden':'visible');
   }
 }
}
};

this.animate = function() {
      // main animation loop
      // move, check status, die etc.
      s.move();
    };

    this.setVelocities = function() {
      s.vX = vRndX+rnd(storm.vMaxX*0.12,0.1);
      s.vY = vRndY+rnd(storm.vMaxY*0.12,0.1);
    };

    this.setOpacity = function(o,opacity) {
     if (!opacitySupported) {
      return false;
    }
    o.style.opacity = opacity;
  };

  this.melt = function() {
   if (!storm.useMeltEffect || !s.melting) {
    s.recycle();
  } else {
    if (s.meltFrame < s.meltFrameCount) {
      s.meltFrame++;
      s.setOpacity(s.o,s.meltFrames[s.meltFrame]);
      s.o.style.fontSize = s.fontSize-(s.fontSize*(s.meltFrame/s.meltFrameCount))+'px';
      s.o.style.lineHeight = storm.flakeHeight+2+(storm.flakeHeight*0.75*(s.meltFrame/s.meltFrameCount))+'px';
    } else {
      s.recycle();
    }
  }
};

this.recycle = function() {
  s.o.style.display = 'none';
  s.o.style.position = (fixedForEverything?'fixed':'absolute');
  s.o.style.bottom = 'auto';
  s.setVelocities();
  s.vCheck();
  s.meltFrame = 0;
  s.melting = false;
  s.setOpacity(s.o,1);
  s.o.style.padding = '0px';
  s.o.style.margin = '0px';
  s.o.style.fontSize = s.fontSize+'px';
  s.o.style.lineHeight = (storm.flakeHeight+2)+'px';
  s.o.style.textAlign = 'center';
  s.o.style.verticalAlign = 'baseline';
  s.x = parseInt(rnd(screenX-storm.flakeWidth-20),10);
  s.y = parseInt(rnd(screenY)*-1,10)-storm.flakeHeight;
  s.refresh();
  s.o.style.display = 'block';
  s.active = 1;
};

    this.recycle(); // set up x/y coords etc.
    this.refresh();

  };

  this.snow = function() {
    var active = 0;
    var used = 0;
    var waiting = 0;
    var flake = null;
    for (var i=s.flakes.length; i--;) {
      if (s.flakes[i].active == 1) {
        s.flakes[i].move();
        active++;
      } else if (s.flakes[i].active === 0) {
        used++;
      } else {
        waiting++;
      }
      if (s.flakes[i].melting) {
       s.flakes[i].melt();
     }
   }
   if (active<s.flakesMaxActive) {
    flake = s.flakes[parseInt(rnd(s.flakes.length),10)];
    if (flake.active === 0) {
      flake.melting = true;
    }
  }
};

this.mouseMove = function(e) {
  if (!s.followMouse) {
   return true;
 }
 var x = parseInt(e.clientX,10);
 if (x<screenX2) {
  windOffset = -windMultiplier+(x/screenX2*windMultiplier);
} else {
  x -= screenX2;
  windOffset = (x/screenX2)*windMultiplier;
}
};

this.createSnow = function(limit,allowInactive) {
  for (var i=0; i<limit; i++) {
    s.flakes[s.flakes.length] = new s.SnowFlake(s,parseInt(rnd(flakeTypes),10));
    if (allowInactive || i>s.flakesMaxActive) {
     s.flakes[s.flakes.length-1].active = -1;
   }
 }
 storm.targetElement.appendChild(docFrag);
};

this.timerInit = function() {
  s.timers = (!isWin9X?[setInterval(s.snow,s.animationInterval)]:[setInterval(s.snow,s.animationInterval*3),setInterval(s.snow,s.animationInterval)]);
};

this.init = function() {
  s.randomizeWind();
    s.createSnow(s.flakesMax); // create initial batch
    addEvent(window,'resize',s.resizeHandler);
    addEvent(window,'scroll',s.scrollHandler);
    if (!isOldIE) {
      addEvent(window,'blur',s.freeze);
      addEvent(window,'focus',s.resume);
    }
    s.resizeHandler();
    s.scrollHandler();
    if (s.followMouse) {
      addEvent(document,'mousemove',s.mouseMove);
    }
    s.animationInterval = Math.max(20,s.animationInterval);
    s.timerInit();
  };

  var didInit = false;

  this.start = function(bFromOnLoad) {
   if (!didInit) {
     didInit = true;
   } else if (bFromOnLoad) {
   // already loaded and running
   return true;
 }
 if (typeof s.targetElement == 'string') {
   var targetID = s.targetElement;
   s.targetElement = document.getElementById(targetID);
   if (!s.targetElement) {
     throw new Error('Snowstorm: Unable to get targetElement "'+targetID+'"');
   }
 }
 if (!s.targetElement) {
   s.targetElement = (!isIE?(document.documentElement?document.documentElement:document.body):document.body);
 }
 if (s.targetElement != document.documentElement && s.targetElement != document.body) {
   s.resizeHandler = s.resizeHandlerAlt; // re-map handler to get element instead of screen dimensions
 }
    s.resizeHandler(); // get bounding box elements
    s.usePositionFixed = (s.usePositionFixed && !noFixed); // whether or not position:fixed is supported
    fixedForEverything = s.usePositionFixed;
    if (screenX && screenY && !s.disabled) {
      s.init();
      s.active = true;
    }
  };

  function doStart() {
   s.start(true);
 }

 if (document.addEventListener) {
    // safari 3.0.4 doesn't do DOMContentLoaded, maybe others - use a fallback to be safe.
    document.addEventListener('DOMContentLoaded',doStart,false);
    window.addEventListener('load',doStart,false);
  } else {
    addEvent(window,'load',doStart);
  }

}

snowStorm = new SnowStorm();
// ]]>
////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////

if  ((document.getElementById) && 
  window.addEventListener || window.attachEvent){

  (function(){

//Configure here...

var xCol = "#ff0000";//red
var yCol = "#00ff00";//green
var zCol = "#0000ff";//blue
var n = 6;   //number of dots per trail.
var t = 40;  //setTimeout speed.
var s = 0.2; //effect speed.

//End.

var r,h,w;
var d = document;
var my = 10;
var mx = 10;
var stp = 0;
var evn = 360/3;
var vx = new Array();
var vy = new Array();
var vz = new Array();
var dy = new Array();
var dx = new Array();

var pix = "px";

var strictmod = ((document.compatMode) && 
  document.compatMode.indexOf("CSS") != -1);


var domWw = (typeof window.innerWidth == "number");
var domSy = (typeof window.pageYOffset == "number");
var idx = d.getElementsByTagName('div').length;

for (i = 0; i < n; i++){
  var dims = (i+1)/2;
  d.write('<div id="x'+(idx+i)+'" style="position:absolute;'
    +'top:0px;left:0px;width:'+dims+'px;height:'+dims+'px;'
    +'background-color:'+xCol+';font-size:'+dims+'px"><\/div>'

    +'<div id="y'+(idx+i)+'" style="position:absolute;top:0px;'
    +'left:0px;width:'+dims+'px;height:'+dims+'px;'
    +'background-color:'+yCol+';font-size:'+dims+'px"><\/div>'

    +'<div id="z'+(idx+i)+'" style="position:absolute;top:0px;'
    +'left:0px;width:'+dims+'px;height:'+dims+'px;'
    +'background-color:'+zCol+';font-size:'+dims+'px"><\/div>');
}

if (domWw) r = window;
else{ 
  if (d.documentElement && 
    typeof d.documentElement.clientWidth == "number" && 
    d.documentElement.clientWidth != 0)
    r = d.documentElement;
  else{ 
    if (d.body && 
      typeof d.body.clientWidth == "number")
      r = d.body;
  }
}


function winsize(){
  var oh,sy,ow,sx,rh,rw;
  if (domWw){
    if (d.documentElement && d.defaultView && 
      typeof d.defaultView.scrollMaxY == "number"){
      oh = d.documentElement.offsetHeight;
    sy = d.defaultView.scrollMaxY;
    ow = d.documentElement.offsetWidth;
    sx = d.defaultView.scrollMaxX;
    rh = oh-sy;
    rw = ow-sx;
  }
  else{
    rh = r.innerHeight;
    rw = r.innerWidth;
  }
  h = rh; 
  w = rw;
}
else{
  h = r.clientHeight; 
  w = r.clientWidth;
}
}


function scrl(yx){
  var y,x;
  if (domSy){
   y = r.pageYOffset;
   x = r.pageXOffset;
 }
 else{
   y = r.scrollTop;
   x = r.scrollLeft;
 }
 return (yx == 0)?y:x;
}


function mouse(e){
  var msy = (domSy)?window.pageYOffset:0;
  if (!e) e = window.event;    
  if (typeof e.pageY == 'number'){
    my = e.pageY - msy + 16;
    mx = e.pageX + 6;
  }
  else{
    my = e.clientY - msy + 16;
    mx = e.clientX + 6;
  }
  if (my > h-65) my = h-65;
  if (mx > w-50) mx = w-50;
}



function assgn(){
  for (j = 0; j < 3; j++){
   dy[j] = my + 50 * Math.cos(stp+j*evn*Math.PI/180) * Math.sin((stp+j*25)/2) + scrl(0) + pix;
   dx[j] = mx + 50 * Math.sin(stp+j*evn*Math.PI/180) * Math.sin((stp+j*25)/2) * Math.sin(stp/4) + pix;
 }
 stp+=s;

 for (i = 0; i < n; i++){
   if (i < n-1){
    vx[i].top = vx[i+1].top; vx[i].left = vx[i+1].left; 
    vy[i].top = vy[i+1].top; vy[i].left = vy[i+1].left;
    vz[i].top = vz[i+1].top; vz[i].left = vz[i+1].left;
  } 
  else{
    vx[i].top = dy[0]; vx[i].left = dx[0];
    vy[i].top = dy[1]; vy[i].left = dx[1];
    vz[i].top = dy[2]; vz[i].left = dx[2];
  }
}
setTimeout(assgn,t);
}


function init(){
  for (i = 0; i < n; i++){
   vx[i] = document.getElementById("x"+(idx+i)).style;
   vy[i] = document.getElementById("y"+(idx+i)).style;
   vz[i] = document.getElementById("z"+(idx+i)).style;
 }
 winsize();
 assgn();
}


if (window.addEventListener){
 window.addEventListener("resize",winsize,false);
 window.addEventListener("load",init,false);
 document.addEventListener("mousemove",mouse,false);
}  
else if (window.attachEvent){
 window.attachEvent("onload",init);
 document.attachEvent("onmousemove",mouse);
 window.attachEvent("onresize",winsize);
} 

})();
}//End.
////////////////////////////////////////////////////////////////////////
function CoKhong1(){
    var random = Math.floor(Math.random() * 100) + 1;
    var yesno;
    if(random % 2 == 0){
      yesno = "Có";
    }else{
      yesno = "Không";
    }
    document.getElementById('r1').value = yesno;
  }
  function CoKhong2(){
    var random = Math.floor(Math.random() * 100) + 1;
    var yesno;
    if(random % 2 == 0){
      yesno = "Có";
    }else{
      yesno = "Không";
    }
    document.getElementById('r2').value = yesno;
  }
  function CoKhong3(){
    var random = Math.floor(Math.random() * 100) + 1;
    var yesno;
    if(random % 2 == 0){
      yesno = "Có";
    }else{
      yesno = "Không";
    }
    document.getElementById('r3').value = yesno;
  }
  function Reset(){
    document.getElementById('r1').value = "NULL";
    document.getElementById('r2').value = "NULL";
    document.getElementById('r3').value = "NULL";
    document.getElementById('result').value = "Kết Quả";
  }
  function showtime(){
    var x = document.getElementById("r1").value;
    var y = document.getElementById("r2").value;
    var z = document.getElementById("r3").value;
    var s;
    if (x=="NULL" || y=="NULL" || z=="NULL") {
      s = "Kết Quả";
    }else if(x == "Có" && (y == "Có" || z == "Có")){
      s = "Có";
    }else if(x == "Không" && (y == "Không" || z == "Không")){
      s = "Không";
    }else if (y=="Có" && (x=="Có"||z=="Có")) {
      s = "Có";
    }else if (y=="Không" && (x=="Không"||z=="Không")) {
      s = "Không";
    }
    document.getElementById('result').innerHTML = s;
    setTimeout(showtime,1);
  }
  showtime();
function Vietlott(){
    var random1 = Math.floor(Math.random() * 45) + 1;
    var random2 = Math.floor(Math.random() * 45) + 1;
    var random3 = Math.floor(Math.random() * 45) + 1;
    var random4 = Math.floor(Math.random() * 45) + 1;
    var random5 = Math.floor(Math.random() * 45) + 1;
    var random6 = Math.floor(Math.random() * 45) + 1;
    if(random1 == random2){random1 = Math.floor(Math.random() * 45) + 1;}
    if(random1 == random3){random1 = Math.floor(Math.random() * 45) + 1;}
    if(random1 == random4){random1 = Math.floor(Math.random() * 45) + 1;}
    if(random1 == random5){random1 = Math.floor(Math.random() * 45) + 1;}
    if(random1 == random6){random1 = Math.floor(Math.random() * 45) + 1;}
    if(random2 == random3){random2 = Math.floor(Math.random() * 45) + 1;}
    if(random2 == random4){random2 = Math.floor(Math.random() * 45) + 1;}
    if(random2 == random5){random2 = Math.floor(Math.random() * 45) + 1;}
    if(random2 == random6){random2 = Math.floor(Math.random() * 45) + 1;}
    if(random3 == random4){random3 = Math.floor(Math.random() * 45) + 1;}
    if(random3 == random5){random3 = Math.floor(Math.random() * 45) + 1;}
    if(random3 == random6){random3 = Math.floor(Math.random() * 45) + 1;}
    if(random4 == random5){random4 = Math.floor(Math.random() * 45) + 1;}
    if(random4 == random6){random4 = Math.floor(Math.random() * 45) + 1;}
    if(random5 == random6){random5 = Math.floor(Math.random() * 45) + 1;}
    document.getElementById('v1').value = random1;
    document.getElementById('v2').value = random2;
    document.getElementById('v3').value = random3;
    document.getElementById('v4').value = random4;
    document.getElementById('v5').value = random5;
    document.getElementById('v6').value = random6;
    alert("Ta ban cho con dãy số này này :))");
  }
  function ResetVlt(){
    document.getElementById('v1').value = "0";
    document.getElementById('v2').value = "0";
    document.getElementById('v3').value = "0";
    document.getElementById('v4').value = "0";
    document.getElementById('v5').value = "0";
    document.getElementById('v6').value = "0";
  }
////////////////////////////////////////////////////////////////////////
function lc(){
  var lc1 = document.getElementById('inp1').value;
  var lc2 = document.getElementById('inp2').value;
  var lc3 = document.getElementById('inp3').value;
  var randomlc = Math.floor(Math.random() * 3) + 1;
  if ( (lc1 == "" && lc2 == "") || (lc1 == "" && lc3 == "") || (lc2 == "" && lc3 == "") ) {
    alert("Bạn phải nhập ít nhất 2 lựa chọn chứ :D");
  } 
  if (randomlc == 1) {document.getElementById('lc').value = lc1;}
  if (randomlc == 2) {document.getElementById('lc').value = lc2;}
  if (randomlc == 3) {document.getElementById('lc').value = lc3;}
  if (lc1 == "") {
    randomlc = Math.floor(Math.random() * 2) + 1;
    if (randomlc == 1) {document.getElementById('lc').value = lc2;}
    if (randomlc == 2) {document.getElementById('lc').value = lc3;}
  }else if (lc2 == "") {
    randomlc = Math.floor(Math.random() * 2) + 1;
    if (randomlc == 1) {document.getElementById('lc').value = lc1;}
    if (randomlc == 2) {document.getElementById('lc').value = lc3;}
  }else if (lc3 == "") {
    randomlc = Math.floor(Math.random() * 2) + 1;
    if (randomlc == 1) {document.getElementById('lc').value = lc1;}
    if (randomlc == 2) {document.getElementById('lc').value = lc2;}
  }
}
function rslc(){
  document.getElementById('inp1').value = "";
  document.getElementById('inp2').value = "";
  document.getElementById('inp3').value = "";
  document.getElementById('lc').value = "";
}
