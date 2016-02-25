/*** RandomDevice Z-Way HA module *******************************************

Version: 1.04
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Randomly enable/disable devices

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RandomDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    RandomDevice.super_.call(this, id, controller);
    
    this.timeoutOff         = undefined;
    this.timeoutRollDice    = undefined;
}

inherits(RandomDevice, AutomationModule);

_module = RandomDevice;

// ----------------------------------------------------------------------------
// --- Module RandomDevice initialized
// ----------------------------------------------------------------------------

RandomDevice.prototype.init = function (config) {
    RandomDevice.super_.prototype.init.call(this, config);
    var self = this;
    
    var currentTime = (new Date()).getTime();
    var langFile = self.controller.loadModuleLang("RandomDevice");
    
    // Create vdev
    self.vDev = self.controller.devices.create({
        deviceId: "RandomDevice_" + self.id,
        defaults: {
            metrics: {
                level: 'off',
                title: langFile.m_title,
                icon: "/ZAutomation/api/v1/load/modulemedia/RandomDevice/icon_off.png",
                triggered: false,
                device: null,
                offTime: null,
                onTime: null
            }
        },
        overlay: {
            probeType: 'RandomController',
            deviceType: 'switchBinary'
        },
        handler: function(command, args) {
            if (command !== 'on'
                && command !== 'off') {
                return;
            }
            console.log('[RandomDevice] Turning '+command+' random device controller');
            this.set("metrics:level", command);
            this.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/RandomDevice/icon_"+command+".png");
            
            if (command === 'on') {
                self.startRollDice();
            } else if (command === 'off') {
                if (self.vDev.get('metrics:triggered') === true) {
                    self.randomOff();
                }
                self.clearRollDice();
            }
        },
        moduleId: self.id
    });
    
    if (self.vDev.get('metrics:triggered') === true) {
        console.log('[RandomDevice] Init found triggered device');
        var offTime = self.vDev.get('metrics:offTime');
        if (offTime > currentTime) {
            self.timeoutOff = setTimeout(
                _.bind(self.randomOff,self),
                (offTime-currentTime)
            );
        } else {
            self.randomOff();
        }
    } else {
        self.vDev.set("metrics:device",null);
        self.vDev.set("metrics:offTime",null);
        self.vDev.set("metrics:onTime",null);
    }
    
    self.startRollDice();
};

RandomDevice.prototype.stop = function() {
    var self = this;
    
    self.clearRollDice();
    
    if (typeof(self.timeoutOff) !== 'undefined') {
        clearTimeout(self.timeoutOff);
        self.timeoutOff = undefined;
    }
    
    if (self.vDev) {
        self.controller.devices.remove(self.vDev.id);
        self.vDev = undefined;
    }
    RandomDevice.super_.prototype.stop.call(this);
};

//----------------------------------------------------------------------------
//--- Module methods
//----------------------------------------------------------------------------

RandomDevice.prototype.clearRollDice = function() {
    var self = this;
    
    if (typeof(self.timeoutRollDice) !== 'undefined') {
        clearTimeout(self.timeoutRollDice);
        self.timeoutRollDice = undefined;
    }
};

RandomDevice.prototype.startRollDice = function() {
    var self = this;
    
    if (self.vDev.get('metrics:level') !== 'on') {
        return;
    }
    
    var interval    = parseInt(self.config.timeTo,10) - parseInt(self.config.timeFrom,10);
    var seconds     = Math.round(Math.random() * interval * 60) + parseInt(self.config.timeFrom,10) * 60;
    
    console.log('[RandomDevice] Roll dice in '+(seconds));
    self.clearRollDice();
    self.timeoutRollDice = setTimeout(
        _.bind(self.rollDice,self), 
        1000*seconds
    );
};

RandomDevice.prototype.rollDice = function () {
    var self=this;
    
    console.log('[RandomDevice] Roll dice');
    
    var currentTime     = (new Date()).getTime();
    var randomOn        = false;
    var devicesConfig   = self.config.devices;
    var triggered       = self.vDev.get('metrics:triggered');
    
    self.startRollDice();
    
    if (triggered === true
        && self.vDev.get('metrics:offTime') < currentTime) {
        self.randomOff();
        triggered = false;
    }
    
    _.each(devicesConfig,function(deviceId) {
        var deviceObject = self.controller.devices.get(deviceId);
        if (deviceObject === null) {
            return;
        }
        
        var deviceLevel  = deviceObject.get('metrics:level');
        if (
            (
                deviceObject.get('deviceType') === 'switchBinary' 
                && deviceLevel === 'off'
            )
            || 
            (
                deviceObject.get('deviceType') === 'switchMultilevel'
                && deviceLevel === 0
            )) {
            if (triggered === true
                && self.vDev.get('metrics:device') === deviceId) {
                self.randomOff();
            }
            return;
        }
        randomOn = true;
    });
    
    // Check any device on
    if (randomOn) {
        console.log('[RandomDevice] Random is already on');
        return;
    }
    
    // Check random device on
    if (self.vDev.get('metrics:level') !== 'on') {
        console.log('[RandomDevice] Random controller is off');
        return;
    }
    
    // Roll dice for trigger
    var randomTrigger = Math.round(Math.random() * 100);
    if (randomTrigger > self.config.probability) {
        console.log('[RandomDevice] No matche');
        return;
    }
    
    // Roll dice for device
    var randomDevice    = Math.round(Math.random() * (devicesConfig.length-1));
    var deviceId        = devicesConfig[randomDevice];
    
    // Roll dice for duration
    var interval        = parseInt(self.config.timeTo,10) - parseInt(self.config.timeFrom,10);
    var minutes         = Math.round(Math.random() * interval) + parseInt(self.config.timeFrom,10);
    var deviceObject    = self.controller.devices.get(deviceId);
    var duration        = (minutes * 60 * 1000);
    var offTime         = currentTime + duration;
    
    if (deviceObject === null) {
        console.error('[RandomDevice] No device for id '+deviceId);
        return;
    }
    
    // Turn on device
    console.log('[RandomDevice] Turning on random device '+deviceObject.id+' for '+minutes+' minutes');
    if (deviceObject.get('deviceType') === 'switchBinary') {
        deviceObject.performCommand('on');
    } else if (deviceObject.get('deviceType') === 'switchMultilevel') {
        deviceObject.performCommand('exact',{ level: 99 });
    } else {
        console.error('[RandomDevice] Unspported device type '+deviceObject.get('deviceType'));
        return;
    }
    
    deviceObject.set('metrics:auto',true);
    
    if (self.timeoutOff) {
        clearTimeout(self.timeoutOff);
    }
    
    self.timeoutOff = setTimeout(
        _.bind(self.randomOff,self),
        duration
    );
    
    //self.clearRollDice();
    self.vDev.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/RandomDevice/icon_triggered.png");
    self.vDev.set("metrics:triggered",true);
    self.vDev.set("metrics:device",deviceObject.id);
    self.vDev.set("metrics:offTime",offTime);
    self.vDev.set("metrics:onTime",currentTime);
};

RandomDevice.prototype.randomOff = function() {
    var self = this;
    
    if (self.vDev.get("metrics:triggered") === false) {
        console.error('[RandomDevice] Random device already off');
        return;
    }
    
    var deviceObject = self.controller.devices.get(self.vDev.get("metrics:device"));
    
    console.log('[RandomDevice] Turning off random device '+deviceObject.id);
    
    deviceObject.performCommand('off');
    deviceObject.set('metrics:auto',false);
    
    if (self.timeoutOff) {
        clearTimeout(self.timeoutOff);
        self.timeoutOff = undefined;
    }
    
    var level = self.vDev.get('metrics:level');
    self.vDev.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/RandomDevice/icon_"+level+".png");
    self.vDev.set("metrics:triggered",false);
    self.vDev.set("metrics:device",null);
    self.vDev.set("metrics:offTime",null);
    self.vDev.set("metrics:onTime",null);
    
    self.controller.emit('light.off',{ 
        id:         self.id,
        title:      self.vDev.get('metrics:title'),
        location:   self.vDev.get('metrics:location'),
        mode:       false
    });
};
