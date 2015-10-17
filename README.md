# Zway-RandomDevice

Randomly turn on/off devices to simulate presence. This plugin will ensure
that only one device is triggered at a time, and that the triggered device
is properly turned off if the random virtual device is turned off.

# Configuration

## timeFrom, timeTo:

Sets the bounds for random devices times

## timeFrom, timeTo:

Sets the bounds for random devices times

## probability:

Sets the probability that a random devices will be turned on

## devices:

List of devices that should be controlled randomly

# Virtual Devices

This module creates a virtual binary switch device to turn on/off the
random device controller. Current operation mode (random light triggered, on, 
off) is indicated by the icon color. metrics:triggered stores if currently
a device is triggered by the random device

# Events

No events are emitted

# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
