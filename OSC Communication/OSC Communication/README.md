# OSC Communication

This connects the camera, Wekinator and the fan.

The camera code sends hand and body information through a Node.js bridge to Wekinator. Wekinator sends a class number to Processing using OSC. Processing passes it to the ESP32 through USB.

## Making the signal more stable

The predictions can change quickly. Processing collects them for **three seconds** and sends the class that appeared most often.

If the result stays the same, it is not sent again. This stops the fan from repeating its first movement every three seconds. The Processing window shows the incoming class, vote counts and last sent class.

## Settings

- Camera bridge: port **8080**.
- Wekinator input: **6448**, `/wek/inputs`.
- Wekinator output: **12000**, `/wek/outputs`.
- Serial speed: **9600**.
- Change `COM6` in the Processing code to your board's port.

## Files and setup

- **CPS16_OSCcom:** open the `.pde` file in Processing and install the **oscP5** library.
- **WebSocket_OSC_Bridge:** a replacement bridge added because the original was missing from our exported files.

With Node.js installed, open a terminal in the bridge folder and run:

```sh
npm ci
npm start
```

With Python installed, open another terminal in `Machine Learning/Camera_Input` and run:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`, allow the camera, then open the Wekinator project. Run Processing and press **Run** in Wekinator. Close Arduino Serial Monitor first so Processing can use the port.

If the board resets, restart Processing. If the signal stops, no automatic stop command is sent to the fan.
