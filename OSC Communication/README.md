# OSC Communication

## Overview
This section documents the Open Sound Control (OSC) communication system connecting the machine learning model, Processing/P5.js, and Arduino.

## Contents
- Processing/P5.js sketches
- Input and output configurations

## How It Works
OSC enables real-time communication between different software components of the project.

Visual inputs are processed by the machine learning system, which generates classification outputs. These outputs are transmitted through OSC to Processing, where they are interpreted and passed along to the Arduino for physical execution.

This communication layer allows the fan's digital behavior to translate into physical movement.

## Configuration
The system uses the following default Wekinator OSC ports:

- **Input:** 6448
- **Output:** 12000

Ensure that the relevant applications are configured to use matching ports.

## Requirements
- Processing/P5.js
- OscP5 library
- Wekinator
- Arduino serial connection

## Our Connection Setup

The p5.js camera code sends its data to a Node.js bridge on port 8080. The bridge converts this into OSC messages for Wekinator.

- Wekinator input message: `/wek/inputs`
- Wekinator output message: `/wek/outputs`
- Processing sends class numbers 1–4 to the ESP32 over USB at 9600 baud.
- Change `COM6` in the Processing sketch to your board's port. Close Arduino Serial Monitor before running Processing.

## Keeping the Output Stable

The predictions can change quickly, so Processing collects them for three seconds and sends the class that appeared most often.

If the result stays the same, it is not sent again. This prevents class 1 from restarting its movement every three seconds.

The Processing window shows the incoming class, vote counts and last sent class. Restart Processing after resetting the board. If no signal arrives, nothing is sent; this does not automatically stop the fan.
