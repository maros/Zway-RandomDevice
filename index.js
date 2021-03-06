/*** RandomDevice Z-Way HA module *******************************************

Version: 1.07
(c) Maroš Kollár, 2015-2017
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

    this.timeoutRollDice    = undefined;
}

inherits(RandomDevice, BaseModule);

_module = RandomDevice;

// ----------------------------------------------------------------------------
// --- Module RandomDevice initialized
// ----------------------------------------------------------------------------

RandomDevice.prototype.init = function (config) {
    RandomDevice.super_.prototype.init.call(this, config);
    var self = this;

    // Create vdev
    self.vDev = self.controller.devices.create({
        deviceId: "RandomDevice_" + self.id,
        defaults: {
            metrics: {
                level: 'off',
                title: self.langFile.m_title,
                icon: self.imagePath+'/icon_off.png',
                triggered: false,
                device: null,
                offTime: null,
                onTime: null
            }
        },
        overlay: {
            probeType: 'controller_random',
            deviceType: 'switchBinary'
        },
        handler: function(command, args) {
            if (command !== 'on'
                && command !== 'off') {
                return;
            }
            self.log('Turning '+command+' random device controller');
            this.set("metrics:level", command);
            this.set("metrics:icon", self.imagePath+'/icon_'+command+".png");

            if (command === 'on') {
                self.rollDice();
            } else if (command === 'off') {
                if (self.vDev.get('metrics:triggered') === true) {
                    self.randomOff();
                }
                self.clearRollDice();
            }
        },
        moduleId: self.id
    });

    setTimeout(_.bind(self.initCallback,self),60*1000);
};

RandomDevice.prototype.initCallback = function() {
    var self = this;

    var currentTime = (new Date()).getTime();

    if (self.vDev.get('metrics:triggered') === true) {
        self.log('Init found triggered device');
        var offTime = self.vDev.get('metrics:offTime');
        if (offTime > currentTime) {
            self.timeoutRollDice = setTimeout(
                _.bind(self.rollDice,self),
                (offTime - currentTime)
            );
        } else {
            self.rollDice();
        }
    } else {
        self.rollDice();
        self.vDev.set("metrics:device",null);
        self.vDev.set("metrics:offTime",null);
        self.vDev.set("metrics:onTime",null);
    }
};

RandomDevice.prototype.stop = function() {
    var self = this;

    self.clearRollDice();

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

RandomDevice.prototype.rollDice = function () {
    var self=this;

    self.log('Roll dice');

    var triggeredDevice;
    var currentTime     = (new Date()).getTime();
    var randomOn        = false;
    var devicesPool     = [];
    var triggered       = self.vDev.get('metrics:triggered');
    var interval        = parseInt(self.config.timeTo,10) - parseInt(self.config.timeFrom,10);
    var seconds         = Math.round(Math.random() * interval * 60) + parseInt(self.config.timeFrom,10) * 60;

    self.clearRollDice();

    // Roll dice again
    if (self.vDev.get('metrics:level') === 'on') {
        self.timeoutRollDice = setTimeout(
            _.bind(self.rollDice,self),
            1000*seconds
        );
    }

    // Get device status
    _.each(self.config.devices,function(deviceId) {
        var deviceObject = self.controller.devices.get(deviceId);
        if (deviceObject === null) {
            return;
        }

        devicesPool.push(deviceObject);

        var deviceLevel  = deviceObject.get('metrics:level');
        if (
            (
                deviceObject.get('deviceType') === 'switchBinary'
                && deviceLevel === 'on'
            )
            ||
            (
                deviceObject.get('deviceType') === 'switchMultilevel'
                && deviceLevel > 0
            )) {

            // Random device triggered
            if (self.vDev.get('metrics:device') === deviceId) {
                triggeredDevice = deviceObject;
            // Device on for some other reason
            } else {
                randomOn = true;
            }
        }
    });

    // Check any device on
    if (randomOn) {
        self.log('A random device is already on');
        return;
    }

    if (devicesPool.length === 0) {
        self.log('No device found');
        return;
    }

    // Check random device on
    if (self.vDev.get('metrics:level') !== 'on') {
        self.log('Random controller is off');
        self.randomOff();
        return;
    }

    // Roll dice for trigger
    var randomTrigger = Math.round(Math.random() * 100);
    if (randomTrigger > self.config.probability) {
        self.log('No match');
        self.randomOff();
        return;
    }

    // Roll dice for device
    var randomIndex     = Math.round(Math.random() * (devicesPool.length-1));
    var randomDevice    = devicesPool[randomIndex];
    var duration        = (seconds * 1000);
    var offTime         = currentTime + duration;

    if (triggeredDevice === randomDevice) {
        self.log('Extending random device '+randomDevice.id+' for another '+seconds+' seconds');
    } else {
        if (typeof(triggeredDevice) !== 'undefined') {
            triggeredDevice.set('metrics:auto',false);
            triggeredDevice.performCommand('off');
        }

        // Turn on device
        self.log('Turning on random device '+randomDevice.id+' for '+seconds+' seconds');
        if (randomDevice.get('deviceType') === 'switchBinary') {
            randomDevice.performCommand('on');
        } else if (randomDevice.get('deviceType') === 'switchMultilevel') {
            randomDevice.performCommand('exact',{ level: 99 });
        } else {
            self.error('Unspported device type '+randomDevice.get('deviceType'));
            return;
        }
    }

    randomDevice.set('metrics:auto',true);

    //self.clearRollDice();
    self.vDev.set("metrics:icon", self.imagePath+'/icon_triggered.png');
    self.vDev.set("metrics:triggered",true);
    self.vDev.set("metrics:device",randomDevice.id);
    self.vDev.set("metrics:offTime",offTime);
    self.vDev.set("metrics:onTime",currentTime);
};

RandomDevice.prototype.randomOff = function() {
    var self = this;

    if (self.vDev.get("metrics:triggered") === false) {
        self.log('Random device already off');
        return;
    }

    var deviceObject = self.controller.devices.get(self.vDev.get("metrics:device"));

    self.log('Turning off random device '+deviceObject.id);

    deviceObject.performCommand('off');
    deviceObject.set('metrics:auto',false);

    var level = self.vDev.get('metrics:level');
    self.vDev.set("metrics:icon", self.imagePath+'/icon_'+level+".png");
    self.vDev.set("metrics:triggered",false);
    self.vDev.set("metrics:device",null);
    self.vDev.set("metrics:offTime",null);
    self.vDev.set("metrics:onTime",null);

    self.controller.emit('light.off',{
        id:         self.id,
        mode:       false,
        vDev:       self.vDev
    });
};
