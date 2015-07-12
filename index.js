/*** RandomDevice Z-Way HA module *******************************************

Version: 1.0.0
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: maros@k-1.com <maros@k-1.com>
Description:
    Randomly enable/disable binary devices

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function RandomDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    RandomDevice.super_.call(this, id, controller);
}

inherits(RandomDevice, AutomationModule);

_module = RandomDevice;

// ----------------------------------------------------------------------------
// --- Module RandomDevice initialized
// ----------------------------------------------------------------------------

RandomDevice.prototype.init = function (config) {
    RandomDevice.super_.prototype.init.call(this, config);
    var self=this;
    
    this.vDev = this.controller.devices.create({
        deviceId: "RandomDevice_" + this.id,
        defaults: {
            metrics: {
                level: 'off',
                title: this.config.title
            }
        },
        overlay: {
            deviceType: 'switchBinary',
            metrics: {
                title: this.config.title
            }
        },
        handler: function(command, args) {
            var level = command;
            this.set("metrics:level", level);
            this.set("metrics:icon", "/ZAutomation/api/v1/load/modulemedia/RandomDevice/icon_"+level+".png");
        },
        moduleId: this.id
    });
    
    this.timer = setInterval(function() {
        self.rollDice();
    }, 1000*60);
};

RandomDevice.prototype.rollDice = function () {
    var self=this;
    
    var currentTime = (new Date()).getTime();
    var randomOn = false;
    var devicesConfig = self.config.devices;
    _.each(devicesConfig,function(deviceId) {
        var deviceObject = self.controller.devices.get(deviceId);
        var deviceOff = deviceObject.get('metrics:autooff');
        var deviceLevel = deviceObject.get('metrics:level');
        
        if (deviceObject.get('deviceType') === 'switchBinary'
            && deviceLevel === 'off') {
            return;
        } else if (deviceObject.get('deviceType') === 'switchMultilevel'
            && deviceLevel === 0) {
            return;
        }
        if (typeof(deviceOff) !== 'null' && deviceOff < currentTime) {
            self.autoOff(deviceObject);
        }
        randomOn = true;
    });
    
    if (self.vDev.get('metrics:level') == 'off') {
        return;
    }
    
    if (randomOn) {
        return;
    }
    
    var randomTrigger = Math.round(Math.random() * 100);
    if (randomTrigger > self.config.probability) {
        return;
    }
    
    var randomDevice = Math.round(Math.random() * (devicesConfig.length-1));
    var deviceId = devicesConfig[randomDevice];
    var deviceObject = self.controller.devices.get(deviceId);
    var randomTime = Math.round(Math.random() * (self.config.timeTo - self.config.timeFrom)) + self.config.timeFrom;
    var offTime = currentTime + (randomTime * 60 * 1000);
    
    console.log('Turning on random device '+deviceId+' for '+randomTime+' minutes');
    if (deviceObject.get('deviceType') === 'switchBinary') {
        deviceObject.performCommand('on');
    } else if (deviceObject.get('deviceType') === 'switchMultilevel') {
        deviceObject.performCommand('exact',99);
    }
    deviceObject.set('metrics:autooff',offTime);
    
    setTimeout(function() {
        self.autoOff(deviceObject);
    },offTime);
};

RandomDevice.prototype.autoOff = function (deviceObject) {
    if (deviceObject.get('deviveType') === 'switchBinary') {
        deviceObject.performCommand('off');
    } else if (device.get('deviveType') === 'switchMultilevel') {
        deviceObject.performCommand('exact',0);
    }
    deviceObject.set('metrics:autooff',null);
}

RandomDevice.prototype.stop = function () {
    RandomDevice.super_.prototype.stop.call(this);
    
    if (this.timer) {
        clearInterval(this.timer);
    }
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }
};
