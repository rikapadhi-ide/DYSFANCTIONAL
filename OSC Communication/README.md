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


