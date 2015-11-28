/*

FEATURES:
- Timer
- Alram
 */
(function($, window) {
  "use strict";
  var QuizTimer, defaults, pluginName,saveTimers,supportsHtml5Storage,completeCircle;
  pluginName = "quiztimer";
  saveTimers = [];
   $.fn.toMilliSec = function() {
        var time=0;
        if(typeof this.prop('hour') != 'undefined') {
          time = this.prop('hour') * 60  * 60 * 1000 ;
        }
        if(typeof this.prop('min')  != 'undefined') {
          time += this.prop('min') * 60 * 1000;
        }
        if(typeof this.prop('sec')  != 'undefined') {
          time += this.prop('sec') * 1000; 
        }
        if(typeof this.prop('milli')  != 'undefined') {
          time += this.prop('milli'); 
        }        
        return  time;
  };
 $.fn.toTime = function(millisec) {
        var time={};
        time.hour = Math.floor((millisec / (60 *60 * 1000)) % 60);
        time.min = Math.floor((millisec / (60 * 1000)) % 60);
        time.sec = Math.floor((millisec / 1000) % 60);
        time.milli = Math.floor(millisec % 1000);
        return  time;
  }; 
 completeCircle = 359.98;
 defaults = {
    namespace: "formsaveStorage",
    webStorage: "localStorage",
    maxItems: 100,
    useOnlyNS:false,
    useStorage:true,
    circleRadius: 60,
    circelOffset:{x:20,y:20},
    iteration:1,
    textStyle:'font-size:24px; font-family:Arial;',
    showAlarm:true,
    iterationCompletedAlarm:true,
    completedAlarmMessage:"Time Completed",
    textOffset: {x:30,y:8},
    alarmInterval:'3',// this is in seconds
    playTimerAudio:true,
    playAlarmAudio:true,
    timerAudioTag: null,
    alarmAudioTag: null,
    showPlayButtons:true,
    showSeconds:false,
    timerInterval:300,
    svgClass:'qtimer',    
    showAlaramText:false,
    time: {
      hour:0,
      min:0,
      sec:30,
    },
    startat: {
      hour:0,
      min:0,
      sec:0,
    },
    alarms: [
        {time:{hour:0,min:0,sec:15},message:"Half Time"},
    ],
    hsl: {
      col_H : 120,
      col_S:95,
      col_L:48,
    },
    keyAttributes: ["tagName", "id"]
  };
  

  QuizTimer = (function() {
    function QuizTimer(element, option) {
      var attr, storageArray;
      this.element = element;
      this._defaults = defaults;
      this._name = pluginName;
      this.$element = $(this.element);
      if (typeof option === "string") {
        this.action = option;
        if($.data(this.element,  "plugin_" + this._name)) {
          option  = $.data(this.element,  "plugin_" + this._name).options;
        } 
      } 
      this.options = $.extend({}, defaults, (typeof option === "object" ? option : void 0));
      var stk = [this.options.namespace];
      if(!this.options.useOnlyNS) {
          this.uri = window.location.host + window.location.pathname;
          stk.push(this.uri);
      } 
      //this.uri = window.location.host + window.location.pathname;
      storageArray = stk.concat((function() {
        var _i, _len, _ref, _results;
        _ref = this.options.keyAttributes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          attr = _ref[_i];
          _results.push(this.element[attr]);
        }
        return _results;
      }).call(this));
      this.storageKey = storageArray.join(".");
      this.storageIndexKey = [this.options.namespace, "index", window.location.host].join(".");
      this.webStorage = window[this.options.webStorage];
      this.time = {};  
      this.time.hour = this.options.time.hour;
      this.time.min = this.options.time.min;
      this.time.sec = this.options.time.sec;
      this.startDateTime = this.currentStartime = new Date();
      this.timetolerance = 60000;
      this.timerInterval = this.options.timerInterval;
      this.duration = this.currentDuration = $(this.time).toMilliSec();
      this.showMins = this.showHours =  false;
       if(this.duration > 3600000) {
        this.showHours = true;
      } else if(this.duration > 60000) {
          this.showMins = true; 
      }
      this.showSeconds = this.options.showSeconds;
      if(this.showHours){
        this.timerInterval = 1000;
      } else  if(this.showMins){
        this.timerInterval = 300;
      } else {
        this.timerInterval = 80;
        //defaults.textOffset = {x:14,y:8};
      }
      //this.endDuration = Date.parse(this.startDateTime) + this.duration;
      this.startTime = this.startDateTime.toLocaleTimeString().toString();
      //this.endDateTime  = this.getEndTime();
      //this.endTime  = this.endDateTime.toLocaleTimeString().toString();
      this.timeleft = this.time;
      this.hsl = this.options.hsl; 
      this.radius = this.options.circleRadius;
      this.offset = this.options.circelOffset;
      this.iteration = this.options.iteration;
      this.caxis = { };
      this.currentIteration = 0 ;
      this.caxis.cx = this.radius + this.offset.x;
      this.caxis.cy = this.radius + this.offset.y;
      this.$progress_circles = [];
      this.$progress_fills = [];
      this.$timerStatus = 0;
      this.storagevar = JSON.stringify({startDateTime: this.startDateTime,startTime:this.startTime,endDateTime:this.endDateTime,endTime:this.endTime,timeleft:this.timeleft });
      if(this.options.playTimerAudio && $(this.options.timerAudioTag).length){
        this.$timeraudio = $(this.options.timerAudioTag);
      } else {
        this.$timeraudio = null;  
      }
      if(this.options.playAlarmAudio && $(this.options.alarmAudioTag).length){
        this.$alarmaudio = $(this.options.alarmAudioTag);
      } else {
        this.$alarmaudio = null;  
      } 
      this.pausedAt = [];
      if(this.options.showAlarm) {
                var alarmEvents = [];
                var alarmMessages = [];
                var _this = this;
                this.alarms = this.options.alarms;
                if(this.alarms.length) {
                  $.each(this.alarms,function(i,alarm) {
                        if(typeof alarm.time != 'undefined') {
                          alarmEvents.push($(alarm.time).toMilliSec());
                          if(typeof alarm.message == 'undefined') {
                            alarmMessages.push('Time Up');    
                          } else {
                            alarmMessages.push(alarm.message);
                          }
                        }
                  });  
                }
                if(this.options.iterationCompletedAlarm) {
                  alarmEvents.push(this.duration - (this.options.alarmInterval * 1000));
                  alarmMessages.push(this.options.completedAlarmMessage);
                }
                //alarmEvents.push(this.duration - (this.options.alarmInterval * 1000));
                //alarmMessages.push(this.options.completedAlarmMessage);
                this.alarmEvents = alarmEvents;
                this.alarmMessages = alarmMessages;
      }
      this.$alarm_circle_tag = null;
      this.$svgClass = [];
      this.$svgClass.push(this.options.svgClass);
      this.$showingAlarm = false;
      //seconds axis;
      if(this.showMins) {
        var radians = 225 * Math.PI / 180;
        this.scaxis = { };
        this.scaxis.cx = this.caxis.cx + Math.sin(radians) * (this.radius*3/5);
        this.scaxis.cy = this.caxis.cy - Math.cos(radians) * (this.radius*3/5);
        this.sradius = (this.radius/3);
        this.scaoffset = {};
        this.scaoffset.x = this.scaxis.cx - this.sradius;
        this.scaoffset.y = this.scaxis.cy - this.sradius;

      }
      this.init();
    }
    QuizTimer.prototype.getEndTime = function() {
        return new Date(Date.parse(this.startDateTime) + this.duration + this.timetolerance)
    }

    QuizTimer.prototype.parseTime  = function() {
         var part = this.startTime.match(/(\d+):(\d+):(\d+)(?: )?(am|pm)?/i);
         var hh = parseInt(part[1], 10);
         var mm = parseInt(part[2], 10);
         var ss = parseInt(part[3], 10);
         var ap = part[4] ? part[4].toUpperCase() : null;
        if (ap === "AM") {
            if (hh == 12) {
                hh = 0;
            }
        }
        if (ap === "PM") {
            if (hh != 12) {
                hh += 12;
            }
        }
        return { hour: hh, min: mm,ss };
    }
    QuizTimer.prototype.remove = function() {
      var e, indexedItems;
      this.stop();
      this.webStorage.removeItem(this.storageKey);
      e = $.Event("qtevent.removed");
      this.$element.trigger(e);
    };

    QuizTimer.prototype.load = function() {
      var e, savedValue;
      savedValue = this.webStorage[this.storageKey];
      if(savedValue && this.options.useStorage) {
        var $saved_timer = JSON.parse(savedValue);
        this.startDateTime = $saved_timer.startDateTime;
        this.startTime = $saved_timer.startTime;
        this.endDateTime  = $saved_timer.endDateTime;
        this.endTime  = $saved_timer.endTime;
        this.timeleft = $saved_timer.timeleft;   
      } 
        e = $.Event("qtevent.loaded");
        return this.$element.trigger(e);
    };

    QuizTimer.prototype.save = function() {
      this.webStorage[this.storageKey] = this.storagevar;
      return this.storagevar;
    };

    QuizTimer.prototype.start = function() {
      var e, saveTimer;

      if($.inArray('paused',this.$svgClass) != -1) {
          this.$svgClass.splice($.inArray('paused',this.$svgClass), 1);
      }
      console.log(this.timeleft);
      this.$svgClass.push('playing');
      this.$timerStatus = 1;
      this.$svg.attr('class',this.$svgClass.join(' '));

      saveTimer = setInterval(((function(_this) {
        return function() {
          return _this.updateTimer();
        };
      })(this)), this.timerInterval);
      saveTimers.push(saveTimer);

        if(this.options.playTimerAudio && this.$timeraudio) {
          this.$timeraudio[0].currentTime=0;
          this.$timeraudio[0].loop = true;
          this.$timeraudio[0].play();
        }
      e = $.Event("qtevent.started");
      return this.$element.trigger(e);
    };

    QuizTimer.prototype.stop = function() {
      var e;
      saveTimers.forEach(function(t) {
        return clearInterval(t);
      });
      this.$timerStatus = 2;
      var date = new Date();
      this.pausedAt.push($.fn.toTime((date.getTime() - Date.parse(this.currentStartime))));
      if($.inArray('playing',this.$svgClass) != -1) {
          this.$svgClass.splice($.inArray('playing',this.$svgClass), 1);
      }
      this.$svgClass.push('paused');
      this.$svg.attr('class',this.$svgClass.join(' '));  
      if(this.options.playTimerAudio && this.$timeraudio ) {
        this.$timeraudio[0].pause();
      }      
      e = $.Event("qtevent.stopped");
      return this.$element.trigger(e);
    };    
    QuizTimer.prototype.updateTime = function(time_left) {

    };

    QuizTimer.prototype.updateTimer = function() {
        var date = new Date();
        var time_diff  = (date.getTime() - Date.parse(this.currentStartime))  % this.currentDuration;
        var time_iterate = (date.getTime() - Date.parse(this.currentStartime)) / this.currentDuration;

         if(this.iteration && this.currentIteration <= time_iterate) {
            this.currentIteration++;
            this.timeleft = this.time;
            var e = $.Event("qtevent.iteration");
            this.$element.trigger(e,[this.currentIteration]);
            console.log('Current Iteration:'+ this.currentIteration); 
        }

        this.timeleft = $.fn.toTime(time_diff);
        if(this.iteration && this.iteration  < this.currentIteration) {
            this.timeleft = this.time;
            this.updateCircles(true);
            if(this.options.showAlarm && this.alarmEvents.length) {
              this.checkAlarm();
            }
            this.stop();   
        } else {
            this.updateCircles(false);
            if(this.options.showAlarm && this.alarmEvents.length) {
              this.checkAlarm();
            }
        }         
             
        //var degrees = 0.36 * diff / theSeconds;
        //var seconds = theSeconds - Math.floor(diff / 1000);
    };
    QuizTimer.prototype.checkAlarm = function() {
        var timerem = this.timeleft;
        timerem.milli = 0;
        var alar_index = $.inArray($(timerem).toMilliSec(),this.alarmEvents);
        if(alar_index != -1) {
            this.alarmEvents.splice(alar_index, 1);
            var alarm_message = this.alarmMessages[alar_index];
            this.alarmMessages.splice(alar_index, 1);
            this.drawAlarm(alarm_message); 
            var e = $.Event("qtevent.alarm");
            this.$element.trigger(e,[alarm_message]);  
        }
      //e = $.Event("qtevent.alarm");
      //return this.$element.trigger(e);
    }

    QuizTimer.prototype.clearAlarm = function() {
        this.$progress_fills = [];
        this.$showingAlarm = false;
        if(this.$alarmaudio && this.options.playAlarmAudio) {
          this.$alarmaudio[0].pause();
        }
        if($.inArray('qt_alarm_vib',this.$svgClass) != -1) {
            this.$svgClass.splice($.inArray('qt_alarm_vib',this.$svgClass), 1);
            this.$svg.attr('class',this.$svgClass.join(' '))
        }
        if(this.$alarm_group) {
            this.$alarm_group.remove();
        }
    }

    QuizTimer.prototype.updateHourCircles = function(completed) {  
        var deg = 360 * ((this.timeleft.min +  (this.timeleft.sec/60)  + (this.timeleft.milli/(60*1000)))  / 60);     
        if(this.showSeconds) {
          var deg_sec  = 360 * (( this.timeleft.sec +  (this.timeleft.milli/1000))  / 60); 
          if(completed) {
              deg = 360 * (this.time.min/60);
              deg_sec = 360 * (this.time.sec/60);
          } 
        }
        var draw = this.drawCoord(deg,this.radius,this.offset);
        if(this.showSeconds) {
          var draw_sec = this.drawCoord(deg_sec,this.sradius,this.scaoffset);
        }
        var col_H = this.hsl.col_H - Math.round(deg / 3);
        var _this = this;
        this.$currentRGB   = this.hsl2rgb(col_H, this.hsl.col_S, this.hsl.col_L);
        //this.$progress.attr('d', draw);
        //this.$progress_mask.attr('d', draw);
        //this.$progress.attr('fill', 'rgb(' + this.$currentRGB.join(', ') + ')');
        //this.$progress_mask.attr('fill', 'rgb(' + this.$currentRGB.join(', ') + ')');
        $.each(this.$progress_circles,function(i,$progress) {
            $progress.attr('d', draw);
            $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
        });
        $.each(this.$progress_fills,function(i,$progress) {
            $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
        });
        if(this.showSeconds) {
          this.$progress_sec.attr('d',draw_sec);
        }
        this.$ts_hour.html(("0" + this.timeleft.hour ).slice(-2));
        this.$ts_min.html(("0" + this.timeleft.min ).slice(-2));
        this.$mts_hour.html(("0" + this.timeleft.hour ).slice(-2));
        this.$mts_min.html(("0" + this.timeleft.min ).slice(-2));

    }
    QuizTimer.prototype.updateMinCircles = function(completed) {
        var deg = 360 * ((this.timeleft.min +  (this.timeleft.sec/60)  + (this.timeleft.milli/(60*1000)))  / (this.time.min + (this.time.sec/60)));     
        if(this.showSeconds) {
          var deg_sec  = 360 * (( this.timeleft.sec +  (this.timeleft.milli/1000))  / 60); 
          if(completed) {
            deg_sec = 360 * (this.time.sec/60);
          } 
        }
        if(completed) {
          deg = completeCircle;
        }
      
        var draw = this.drawCoord(deg,this.radius,this.offset);

        if(this.showSeconds) {        
          var draw_sec = this.drawCoord(deg_sec,this.sradius,this.scaoffset);
        }
        var col_H = this.hsl.col_H - Math.round(deg / 3);
        var _this = this;
        this.$currentRGB   = this.hsl2rgb(col_H, this.hsl.col_S, this.hsl.col_L);
        //this.$progress.attr('d', draw);
        //this.$progress_mask.attr('d', draw);
        //this.$progress.attr('fill', 'rgb(' + this.$currentRGB.join(', ') + ')');
        //this.$progress_mask.attr('fill', 'rgb(' + this.$currentRGB.join(', ') + ')');
        $.each(this.$progress_circles,function(i,$progress) {
            $progress.attr('d', draw);
            $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
        });
        $.each(this.$progress_fills,function(i,$progress) {
            $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
        });
        if(this.showSeconds) {
          this.$progress_sec.attr('d',draw_sec);
        }        
        this.$ts_min.html(("0" + this.timeleft.min ).slice(-2));
        this.$mts_min.html(("0" + this.timeleft.min ).slice(-2));
        

        
        
    }
    QuizTimer.prototype.updateSecCircles = function(completed) {
          var deg = 360 * ((this.timeleft.sec +  (this.timeleft.milli/1000))  / this.time.sec);

          if(completed) {
            deg = completeCircle;
          }
          var draw = this.drawCoord(deg,this.radius,this.offset);  
          var col_H = this.hsl.col_H - Math.round(deg / 3);
          var _this = this;
          this.$currentRGB   = this.hsl2rgb(col_H, this.hsl.col_S, this.hsl.col_L);
          $.each(this.$progress_circles,function(i,$progress) {
              $progress.attr('d', draw);
              $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
          });
          $.each(this.$progress_fills,function(i,$progress) {
              $progress.attr('fill', 'rgb(' + _this.$currentRGB.join(', ') + ')');
          });          
          this.$min_text.html(("0" + this.timeleft.sec).slice(-2));
          this.$min_text_mask.html(("0" + this.timeleft.sec).slice(-2));
    }
    QuizTimer.prototype.updateCircles = function(completed) {
        //var RGB = [];
        if(this.showHours) {
          this.updateHourCircles(completed);
        }
        if(this.showMins) {
          this.updateMinCircles(completed);
        } else {
          this.updateSecCircles(completed);
        }   
          
        //this.$min_text.html(("0" + this.timeleft.hour).slice(-2) + ':' + ("0" + this.timeleft.min ).slice(-2)+ ':'  + ("0" + this.timeleft.sec ).slice(-2) );
        //this.$min_text_mask.html(("0" + this.timeleft.hour).slice(-2) + ':' + ("0" + this.timeleft.min ).slice(-2)+ ':'  + ("0" + this.timeleft.sec ).slice(-2));
    };

    QuizTimer.prototype.hsl2rgb = function(H, S, L){
        var R, G, B;
        var t1, t2;
        
        H = H / 360;
        S = S / 100;
        L = L / 100;
        
        if ( S == 0 ) {
            R = G = B = L;
        } else {
            
            
            var t1 = (L < 0.5) ? L * (1 + S) : L + S - L * S;
            var t2 = 2 * L - t1;
            
            R = this.hue2rgb(t1, t2, H + 1/3);
            G = this.hue2rgb(t1, t2, H);
            B = this.hue2rgb(t1, t2, H - 1/3);
        }
        
        return [
            Math.round(R * 255), 
            Math.round(G * 255), 
            Math.round(B * 255)
        ];
    };    
    QuizTimer.prototype.hue2rgb = function(t1, t2, t3) {
        if (t3 < 0) t3 += 1;
        if (t3 > 1) t3 -= 1;
        
        if (t3 * 6 < 1) return t2 + (t1 - t2) * 6 * t3;
        if (t3 * 2 < 1) return t1;
        if (t3 * 3 < 2) return t2 + (t1 - t2) * (2 / 3 - t3) * 6;
        
        return t2;      
    };


    QuizTimer.prototype.drawCoord = function(degrees,radius,offset) {
        var radians = degrees * Math.PI / 180;
        
        var rX = radius + offset.x + Math.sin(radians) * radius;
        var rY = radius + offset.y - Math.cos(radians) * radius;
        
        var dir = (degrees > 180) ? 1 : 0;
        
        var coord = 'M' + (radius + offset.x) + ',' + (radius + offset.y) + ' ' + 
                    'L' + (radius + offset.x) + ',' + offset.y + ' ' +
                    'A' + radius + ',' + radius + ' 0 ' + dir + ',1 ' +
                    rX + ',' + rY;
        
        return coord;      
    };
    QuizTimer.prototype.drawAlarm = function(alarm_message) {
        var rect = { }; 
        rect.x = (2 * ((this.radius/2) + 20) * Math.sin(30 * Math.PI / 180));
        rect.y = (2 * ((this.radius/2) + 20) * Math.sin(10 * Math.PI / 180));  
        var group_alarm =  $(document.createElementNS("http://www.w3.org/2000/svg","g"));
        if(this.options.showAlaramText) {
          var alarm_text =  $(document.createElementNS("http://www.w3.org/2000/svg","text"));
        }
        var srect1 = $(document.createElementNS("http://www.w3.org/2000/svg","rect")).attr('width', rect.x).attr('height',rect.y).attr('stroke','grey').attr('stroke-width','1').attr('fill','rgb(' + this.$currentRGB.join(', ') + ')');
        var srect2 = $(document.createElementNS("http://www.w3.org/2000/svg","rect")).attr('width', rect.x).attr('height',rect.y).attr('stroke','grey').attr('stroke-width','1').attr('fill','rgb(' + this.$currentRGB.join(', ') + ')');        
        var radiansleft = 295 * Math.PI / 180;
        
        var rleftX = this.caxis.cx -  rect.y + Math.sin(radiansleft) * this.radius;
        var rleftY = this.caxis.cy -  rect.y - Math.cos(radiansleft) * this.radius;
        var radiansright = 25 * Math.PI / 180;
        var rrightX = this.caxis.cx  +  rect.y + Math.sin(radiansright) * this.radius;
        var rrightY = this.caxis.cy  -  rect.y - Math.cos(radiansright) * this.radius;
        var almin_path = $(document.createElementNS("http://www.w3.org/2000/svg","path")).attr('stroke','grey').attr('stroke-width','1').attr('fill','rgb(' + this.$currentRGB.join(', ') + ')');
        var radiansmright = 90 * Math.PI / 180;
        var radiansmleft = 225 * Math.PI / 180;
        var radiansmaright = 135 * Math.PI / 180;
        var radiusmin =  (rect.y/(2 * Math.sin(45 * Math.PI / 180)));
        var rmrightX = this.caxis.cx  + (rect.y/2);
        var rmrightY = this.caxis.cy  - Math.cos(radiansmright) * radiusmin;
        var rmleftX = this.caxis.cx  +  Math.sin(radiansmleft) * radiusmin; 
        var rmleftY = this.caxis.cy  -  Math.cos(radiansmleft) * radiusmin;
        var rmarightX = rmleftX  +  Math.sin(radiansmaright) * rect.x; 
        var rmarightY = rmleftY  -  Math.cos(radiansmaright) * rect.x;
        var rmarX = rmrightX  +  Math.sin(radiansmaright) * (rect.x - (rect.y/2)); 
        var rmarY = rmrightY  -  Math.cos(radiansmaright) * (rect.x - (rect.y/2));
        var alarm_circle_tag = $(document.createElementNS("http://www.w3.org/2000/svg","circle")).attr('cx',this.caxis.cx ).attr('cy',this.caxis.cy ).attr('r',this.radius ).attr('stroke','#444').attr('stroke-width','4').attr('stroke-opacity','1').attr('fill','none');
        
        var _this = this;

        srect1.attr('transform','translate('+rleftX+' '+rleftY+') rotate(-45 0 0)');
        group_alarm.append(srect1); 
        
        srect2.attr('transform','translate('+rrightX+' '+rrightY+') rotate(45 0 0)');
        group_alarm.append(srect2);
        group_alarm.append(srect1);
        almin_path.attr('d','M '+ rmrightX+ ','+  rmrightY + ' L ' + ( this.caxis.cx + (rect.y / 2)) +','+ ( this.caxis.cy - rect.x) + ' L '+ ( this.caxis.cx - (rect.y / 2)) +','+ ( this.caxis.cy - rect.x) + ' L '+  rmleftX+ ','+  rmleftY + ' L '+  rmarightX + ','+  rmarightY+ ' L '+  rmarX + ','+  rmarY  + ' Z');
        if(this.options.showAlaramText) {
          alarm_text.attr('class','qt_alram_text').attr('fill','#444');
          alarm_text.attr('x','50%').attr('y',this.caxis.cy * 2);
          alarm_text.attr('text-anchor','middle');
          alarm_text.html(alarm_message);        
          group_alarm.append(alarm_text);  
        }
        group_alarm.append(almin_path)  
        alarm_circle_tag.attr('class','qt_alarm');
        group_alarm.append(alarm_circle_tag);
        group_alarm.attr('class','qt_alarm_vib_op');
        
        if(this.$alarm_group) {
            this.$alarm_group.remove();
        }

        if($.inArray('qt_alarm_vib',this.$svgClass) != -1) {
            this.$svgClass.splice($.inArray('qt_alarm_vib',this.$svgClass), 1);
        }

        //this.$svg.offsetWidth =  this.$svg.offsetWidth; 
        this.$alarm_group =  group_alarm;
        this.$svg.append(group_alarm);
        //this.$svg.attr('class','qt_alarm_vib');
        // triggers reflow
        this.$progress_fills.push(srect2);
        this.$progress_fills.push(srect1);
        this.$progress_fills.push(almin_path);
        setTimeout(
          function(){_this.$svgClass.push('qt_alarm_vib');_this.$svg.attr('class',_this.$svgClass.join(' ')); }
        , 1);
        if(this.$alarmaudio && this.options.playAlarmAudio) {
          this.$alarmaudio[0].currentTime=0;
          this.$alarmaudio[0].loop = true;
          this.$alarmaudio[0].play();
        }
        setTimeout(
          function(){_this.clearAlarm();}
        , _this.options.alarmInterval * 1000);  
        this.$showingAlarm = true;    
    }
    QuizTimer.prototype.drawTimer = function() {
        var  svg  =  document.createElementNS("http://www.w3.org/2000/svg",'svg');
        var radialgradient  =  document.createElementNS("http://www.w3.org/2000/svg",'radialGradient');
        var clipPath =  document.createElementNS("http://www.w3.org/2000/svg",'clipPath');
        var group_timer = $(document.createElementNS("http://www.w3.org/2000/svg",'g'));
        var circle_bg = $(document.createElementNS("http://www.w3.org/2000/svg",'circle')).attr('cx',this.caxis.cx ).attr('cy',this.caxis.cy ).attr('r',this.radius ).attr('fill','#333');
        var rect_vert = $(document.createElementNS("http://www.w3.org/2000/svg",'rect')).attr('x',this.caxis.cx - 1).attr('y',this.offset.y).attr('width',2).attr('height',this.radius * 2).attr('fill','#000').attr('fill-opacity','0.5');      
        var rect_horz = $(document.createElementNS("http://www.w3.org/2000/svg",'rect')).attr('x',this.offset.x).attr('y',this.caxis.cy - 1).attr('width',this.radius * 2).attr('height',2).attr('fill','#000').attr('fill-opacity','0.5');      
        var circle_sw = $(document.createElementNS("http://www.w3.org/2000/svg",'circle')).attr('cx',this.caxis.cx ).attr('cy',this.caxis.cy ).attr('r',this.radius ).attr('fill','url(#shadow)');
        var rect_vert_mask = $(document.createElementNS("http://www.w3.org/2000/svg",'rect')).attr('x',this.caxis.cx - 1).attr('y',this.offset.y).attr('width',2).attr('height',this.radius * 2).attr('fill','#923412').attr('fill-opacity','0.5').attr('clip-path','url(#mask)');      
        var rect_horz_mask = $(document.createElementNS("http://www.w3.org/2000/svg",'rect')).attr('x',this.offset.x).attr('y',this.caxis.cy - 1).attr('width',this.radius * 2).attr('height',2).attr('fill','#923412').attr('fill-opacity','0.5').attr('clip-path','url(#mask)');      
        var circle_shadow = $(document.createElementNS("http://www.w3.org/2000/svg",'circle')).attr('cx',this.caxis.cx ).attr('cy',this.caxis.cy ).attr('r',this.radius ).attr('fill','url(#shadow)').attr('clip-path','url(#mask)');
        

        $(svg).attr('xmlns','http://www.w3.org/2000/svg').attr('version',"1.1");
        $(svg).attr('width',(this.caxis.cx) * 2 );
        $(svg).attr('height',(this.caxis.cy) * 2);

        $(radialgradient).attr('cx','50%').attr('cy','50%').attr('r','50%').attr('fx','50%').attr('fy','50%');
        $(radialgradient).attr('id','shadow');
        $(radialgradient).append($(document.createElementNS("http://www.w3.org/2000/svg",'stop')).attr('offset','90%').attr('stop-color','#000').attr('stop-opacity','0'));        
        $(radialgradient).append($(document.createElementNS("http://www.w3.org/2000/svg",'stop')).attr('offset','100%').attr('stop-color','#000').attr('stop-opacity','0.4'));  

        $(clipPath).attr('id','mask');  
        this.$progress_mask = $(document.createElementNS("http://www.w3.org/2000/svg",'path')).attr('class','progress_mask').attr('d','').attr('fill','#7b0'); 
        $(clipPath).append(this.$progress_mask);
        this.$defs = $(document.createElementNS("http://www.w3.org/2000/svg",'defs')).append(radialgradient).append(clipPath);
        this.$progress =  $(document.createElementNS("http://www.w3.org/2000/svg",'path')).attr('class','progress').attr('d','').attr('fill','#7b0');        
        if(this.showMins) {
            this.$min_text = $(document.createElementNS("http://www.w3.org/2000/svg",'text')).attr('class','min_text').attr('x',this.caxis.cx - this.options.textOffset.x).attr('y',this.caxis.cy + this.options.textOffset.y).attr('text-anchoor','middle').attr('fill','#fff').attr('style',this.options.textStyle);  
            this.$ts_hour = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_th').attr('text-anchoor','middle').html('00');  
            this.$ts_col = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_tc').attr('text-anchoor','middle').html(':');    
            this.$ts_min = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_tm').attr('text-anchoor','middle').html('00');  
            this.$min_text.append( this.$ts_hour);
            this.$min_text.append( this.$ts_col);
            this.$min_text.append(this.$ts_min);  
            this.$min_text_mask = $(document.createElementNS("http://www.w3.org/2000/svg",'text')).attr('class','min_text_mask').attr('x',this.caxis.cx - this.options.textOffset.x).attr('y',this.caxis.cy + this.options.textOffset.y).attr('text-anchoor','middle').attr('fill','#444').attr('style',this.options.textStyle).attr('clip-path','url(#mask)'); 
            this.$mts_hour = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_mask_th').attr('text-anchoor','middle').html('00');  
            this.$mts_col = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_mask_tc').attr('text-anchoor','middle').html(':');    
            this.$mts_min = $(document.createElementNS("http://www.w3.org/2000/svg",'tspan')).attr('class','min_text_mask_tm').attr('text-anchoor','middle').html('00');  
            this.$min_text_mask.append(this.$mts_hour);
            this.$min_text_mask.append(this.$mts_col);
            this.$min_text_mask.append(this.$mts_min);  
        } else {
        this.$min_text = $(document.createElementNS("http://www.w3.org/2000/svg",'text')).attr('id','min_text').attr('x',this.caxis.cx - this.options.textOffset.x).attr('y',this.caxis.cy + this.options.textOffset.y).attr('text-anchoor','middle').attr('fill','#fff').attr('style',this.options.textStyle).html('00');  
        this.$min_text_mask = $(document.createElementNS("http://www.w3.org/2000/svg",'text')).attr('id','min_text_mask').attr('x',this.caxis.cx - this.options.textOffset.x).attr('y',this.caxis.cy + this.options.textOffset.y).attr('text-anchoor','middle').attr('fill','#444').attr('style',this.options.textStyle).attr('clip-path','url(#mask)').html('00'); 
        }
        this.$progress_circles.push(this.$progress);
        this.$progress_circles.push(this.$progress_mask);
        if(this.showMins) {
          this.$progress_sec =  $(document.createElementNS("http://www.w3.org/2000/svg",'path')).attr('id','progress_sec').attr('d','').attr('fill','#fff');        
        }
        group_timer.append(circle_bg);
        group_timer.append(rect_vert);
        group_timer.append(rect_horz);
        group_timer.append(circle_sw);        
        group_timer.append(this.$min_text);        
        group_timer.append(this.$progress);
        group_timer.append(rect_vert_mask);
        group_timer.append(rect_horz_mask);
        group_timer.append(this.$min_text_mask);
        group_timer.append(circle_shadow);  
        group_timer.append(this.$progress_sec);  
        this.$svg = $(svg);
        this.$svg.append(this.$defs);        
        this.$svg.append(group_timer);
        this.$element.append(svg); 
        this.$svg.attr('class',this.$svgClass.join(' '));
    };
  QuizTimer.prototype.drawButtons = function() {
        var group_buttons =       
          $(document.createElementNS("http://www.w3.org/2000/svg",'g'));
        var group_play_button =       
          $(document.createElementNS("http://www.w3.org/2000/svg",'g')).attr('class','play_button');
        var group_pause_button =      
          $(document.createElementNS("http://www.w3.org/2000/svg",'g')).attr('class','pause_button');
        var rect = { }; 
        rect.x = (2 * ((this.radius/2) + 20) * Math.sin(30 * Math.PI / 180));
        rect.y = (2 * ((this.radius/2) + 20) * Math.sin(10 * Math.PI / 180));  
        var srect1 = $(document.createElementNS("http://www.w3.org/2000/svg","rect")).attr('width', rect.x).attr('height',rect.y).attr('stroke','grey').attr('stroke-width','1').attr('fill','#777').attr('fill-opacity','0.6');
        var srect2 = $(document.createElementNS("http://www.w3.org/2000/svg","rect")).attr('width', rect.x).attr('height',rect.y).attr('stroke','grey').attr('stroke-width','1').attr('fill','#777').attr('fill-opacity','0.6');
        var radiansmX = 330 * Math.PI / 180;
        var radiansmY= 180 * Math.PI / 180;
        var radiansmZ= 60 * Math.PI / 180; 
        var trradius =  (rect.x * 2 / 3 );
        var trheight = (( 2 * rect.x) / Math.sqrt(3)) ;
        var rmXY = this.caxis.cx  +  Math.sin(radiansmX) * trradius; 
        var rmYZ = this.caxis.cy  - Math.cos(radiansmX) * trradius;
        var rmYX = rmXY  +  Math.sin(radiansmY) * trheight; 
        var rmZX = rmYZ  - Math.cos(radiansmY) * trheight;
        var rmZY = rmYX  +  Math.sin(radiansmZ) * trheight; 
        var rmXZ = rmZX  - Math.cos(radiansmZ) * trheight;
        var play_path = $(document.createElementNS("http://www.w3.org/2000/svg","path")).attr('stroke','grey').attr('stroke-width','1').attr('fill','#777').attr('fill-opacity','0.6');
        
        srect1.attr('transform','translate('+ (this.caxis.cx - (rect.y/2)) +' ' + (this.caxis.cy - (rect.x/2)) + ') rotate(90,0,0)');
        srect2.attr('transform','translate('+ (this.caxis.cx + (rect.y * 3/2)) +' ' + (this.caxis.cy - (rect.x/2)) + ') rotate(90,0,0)');        
        
        group_pause_button.append(srect1);
        group_pause_button.append(srect2);
        group_buttons.append(group_pause_button);
        
        play_path.attr('d','M '+ rmXY +','+ rmYZ +' L '+ rmXY +','+ rmYZ +' L '+ rmYX +','+ rmZX +' L '+ rmZY +','+ rmXZ +' Z' );
        this.$group_play_button = group_play_button;
        this.$group_pause_button = group_pause_button;
        group_play_button.append(play_path);
        group_buttons.append(group_play_button);
        this.$svg.append(group_buttons);
        
        
    }

    QuizTimer.prototype.bindQTimerEvents = function() {
        var _this = this;
        this.$group_pause_button.hide();
        this.$group_play_button.hide();
        this.$svg.mouseenter(function() {
            if(!_this.$showingAlarm) {
                  if(_this.$timerStatus == 1) {
                      _this.$group_pause_button.show();
                      _this.$group_play_button.hide();
                  } else if(_this.$timerStatus == 2) {
                      _this.$group_pause_button.hide();
                      _this.$group_play_button.show();
                  }
            }
        })
        .mouseleave(function() { 
            _this.$group_pause_button.hide();
            _this.$group_play_button.hide();

        });
        this.$group_pause_button.bind('click',function() {
          if(!_this.showingAlarm) {
             _this.stop();
              _this.$group_pause_button.hide();
             _this.$group_play_button.show();
          }
        });
         this.$group_play_button.bind('click',function() {
            if(_this.pausedAt.length) {
              var time_elapsed = _this.pausedAt[_this.pausedAt.length - 1];
              var date = new Date();
              _this.currentStartime = new Date(date.getTime() -$(time_elapsed).toMilliSec());
              _this.start();
              _this.$group_pause_button.show();
              _this.$group_play_button.hide();
            }

        });       
    }
    QuizTimer.prototype.init = function() {
      if (this.webStorage[this.storageIndexKey] === void 0) {
        this.webStorage[this.storageIndexKey] = "[]";
      }
      switch (this.action) {
        case "remove":
          return this.remove();
        case "refresh":
          return this.stop();
                 this.start();
                 this.$timerStatus
        case "start":
          return this.start();
        case "stop":
          return this.stop();
        case "load":
          return this.load();
        case "save":
          return this.save();
        default:
          this.drawTimer();
          if(this.options.showPlayButtons) {
            this.drawButtons();   
            this.bindQTimerEvents(); 
          }
          this.load();
          this.start();
          if (this.options.clearOnSubmit) {
            $(this.options.clearOnSubmit).submit((function(_this) {
              return function() {
                return _this.remove();
              };
            })(this));
          }
      }
    };

    return QuizTimer;

  })();
  supportsHtml5Storage = function(webStorage) {
    try {
      return webStorage in window && window[webStorage] !== null;
    } catch (_error) {
      return false;
    }
  };
  $.fn[pluginName] = function(option) {
    var pluginID;
    pluginID = "plugin_" + pluginName;
    if(typeof option == 'undefined') {
          option = {}
    }
    return this.each(function() {
      if (supportsHtml5Storage(option.webStorage || defaults.webStorage)) {
        return $.data(this, pluginID, new QuizTimer(this, option));
      }
    });
  };
})(jQuery, window);
