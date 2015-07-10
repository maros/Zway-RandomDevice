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
            deviceType: 'switchBinary'
        },
        handler: function(command, args) {
            var level = command;
            this.set("metrics:level", level);
        },
        moduleId: this.id
    });
    
    this.timer = setInterval(function() {
        self.rollDice();
    }, 1000*60);
};

RandomDevice.prototype.rollDice = function () {
    
    // TODO
};

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
