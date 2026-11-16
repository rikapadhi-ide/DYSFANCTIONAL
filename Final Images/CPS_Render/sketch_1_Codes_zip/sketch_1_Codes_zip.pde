import processing.serial.*;
import oscP5.*;

final String PORT_NAME = "COM6";
final int BAUD = 9600;
final int WINDOW_MS = 3000;

Serial device;
OscP5 osc;

final Object lock = new Object();
int[] votes = new int[5];

int latestClass = 0;
int sentClass = 0;
int windowStarted;
String status = "Waiting for OSC";

void setup() {
  size(600, 280);
  textSize(20);

  // Print available serial ports.
  printArray(Serial.list());

  try {
    device = new Serial(this, PORT_NAME, BAUD);
    println("Serial connected: " + PORT_NAME);
  }
  catch (Exception e) {
    println("Serial connection failed: " + e.getMessage());
  }

  windowStarted = millis();
  osc = new OscP5(this, 12000);
}

void draw() {
  int now = millis();

  synchronized (lock) {
    if (now - windowStarted >= WINDOW_MS) {
      int winner = 0;
      int highestCount = 0;

      // Find the most frequent class.
      for (int i = 1; i <= 4; i++) {
        if (votes[i] > highestCount) {
          highestCount = votes[i];
          winner = i;
        }
      }

      // Keep the previous class if it is tied for first place.
      if (sentClass >= 1 &&
          highestCount > 0 &&
          votes[sentClass] == highestCount) {
        winner = sentClass;
      }

      if (highestCount == 0) {
        status = "No OSC received: nothing sent";
      }
      else if (device == null) {
        status = "Serial not connected";
      }
      else {
        try {
          // Send an ASCII class number followed by a newline.
          device.write(str(winner) + "\n");
          sentClass = winner;
          status = "Sent class: " + winner;
          println(status);
        }
        catch (Exception e) {
          status = "Serial write failed";
          println(e.getMessage());
          device = null;
        }
      }

      // Start a new voting window.
      for (int i = 1; i <= 4; i++) {
        votes[i] = 0;
      }
      windowStarted = now;
    }

    background(24, 28, 38);
    fill(255);

    text("OSC → Serial / 3-second vote", 25, 40);
    text("Port: " + PORT_NAME
      + (device != null ? " / Connected" : " / Not connected"),
      25, 80);
    text("Latest OSC: " + latestClass
      + "    Last sent: " + sentClass, 25, 120);
    text("Collecting: "
      + nf((now - windowStarted) / 1000.0f, 1, 1)
      + " / 3.0 s", 25, 160);
    text("Votes: 1=" + votes[1]
      + "  2=" + votes[2]
      + "  3=" + votes[3]
      + "  4=" + votes[4], 25, 200);
    text(status, 25, 240);
  }

  // Display Arduino replies in the Processing console.
  if (device != null) {
    while (device.available() > 0) {
      print((char)device.read());
    }
  }
}

void oscEvent(OscMessage msg) {
  if (!msg.checkAddrPattern("/wek/outputs")) return;

  float value;

  if (msg.typetag().equals("f")) {
    value = msg.get(0).floatValue();
  }
  else if (msg.typetag().equals("i")) {
    value = msg.get(0).intValue();
  }
  else {
    return;
  }

  if (Float.isNaN(value) || Float.isInfinite(value)) return;

  int cls = round(value);
  if (cls < 1 || cls > 4 || abs(value - cls) > 0.01f) return;

  synchronized (lock) {
    latestClass = cls;
    votes[cls]++;
  }
}
