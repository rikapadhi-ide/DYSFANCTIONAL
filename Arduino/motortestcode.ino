//UNIT TEST DEBUG

/*
This is code that will help you debug the motors by 
individually moving them to eliminate the possibility that
the motors themselves are broken/not recieving input.

*/

#include <ESP32Servo.h>
//This is the library for servos paired with the ESP32 3S. Make sure to also download the ESP board managers and drivers.

Servo servo1; //BASE SERVO
Servo servo2; //MIDDLE SERVO
Servo servo3; //TOP SERVO

void setup() {
  // This line sets up communication between the IDE and the arduino.
  Serial.begin(9600);

  //This attaches the servo to the pin.
  servo1.attach(5);
  servo2.attach(6);
  servo3.attach(7);

  /*These lines move each motor according to the degree of motion they should have.
  In order to test each motor one at a time, comment the other lines out */

  servo1.write(180);
  /*
  servo2.write(90);
  servo3.write(90);
  */

}

void loop() {

}
