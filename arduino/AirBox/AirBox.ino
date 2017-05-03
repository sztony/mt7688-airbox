#include <stdio.h>
#include <math.h>
#include <SoftwareSerial.h>

// TFT
#include "SPI.h"
#include "Adafruit_GFX.h"
#include "Adafruit_ILI9341.h"

// DHT22
#include "DHT.h"

// TFT
#define TFT_RST 2
#define TFT_DC 3
#define TFT_CS 4
#define TFT_MOSI 5
#define TFT_MISO 6
#define TFT_CLK 7

// DHT22
#define DHTTYPE DHT22
#define DHTPIN 16

// G3
#define G3_RX 14
#define G3_TX 15

// MQ9
#define MQ9PIN 23

// Speech
#define SPEECH_RX 8
#define SPEECH_TX 9

// Speech and PM2.5 cannot turn on at the same time.
// Set to 1 to turn on Speech and PM2.5 will be disaled.
#define SPEECH_FLAG 1

// TFT
Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_MOSI, TFT_CLK, TFT_RST, TFT_MISO);

// DHT22
DHT dht(DHTPIN, DHTTYPE);
float humidity;
float temperature;

// G3
SoftwareSerial G3(G3_RX, G3_TX);
long pmcf10;
long pmcf25;
long pmcf100;
long pmat10;
long pmat25;
long pmat100;

// MQ9
float sensorValue;
float sensorVolt;
float RS;
float R0;
float ratio;
float ppm;

// serial communication
// first byte:
//   0x00 -> humidity
//   0x01 -> temperature
//   0x02 -> pmat25
//   0x03 -> ppm
// the rest 4 bytes:
//   actual value * 100
byte packet[5];

// Speech
SoftwareSerial Speech(SPEECH_RX, SPEECH_TX);
const char *voiceBuffer[] = {
    "Turn on the light",
    "Turn off the light",
    "Play music",
    "Pause",
    "Next",
    "Previous",
    "Up",
    "Down",
    "Turn on the TV",
    "Turn off the TV",
    "Increase temperature",
    "Decrease temperature",
    "What's the time",
    "Open the door",
    "Close the door",
    "Left",
    "Right",
    "Stop",
    "Start",
    "Mode 1",
    "Mode 2",
    "Go",
};
char cmd;

void setup() {
  tft.begin();
  dht.begin();
  G3.begin(9600);

  // Speech
  if (SPEECH_FLAG) {
    Speech.begin(9600);
    Speech.listen();
  }

  // Debug Serial
  Serial.begin(9600);

  // to MPU
  Serial1.begin(57600);

  // Initial TFT Screen
  tft.fillScreen(ILI9341_BLACK);
}

void loop() {

  // Read humidity
  humidity = dht.readHumidity();
  if (!isnan(humidity)) {
    showText(10, 10, "Humidity", humidity, "%");
    sendValue(0x00, humidity);
  }

  // Read temperature as Celsius
  temperature = dht.readTemperature();
  if (!isnan(temperature)) {
    showText(10, 90, "Temperature", temperature, "C");
    sendValue(0x01, temperature);
  }

  // Read G3 PM2.5
  pmcf10 = 0;
  pmcf25 = 0;
  pmcf100 = 0;
  pmat10 = 0;
  pmat25 = 0;
  pmat100 = 0;
  readG3(pmcf10, pmcf25, pmcf100, pmat10, pmat25, pmat100);
  showText(10, 170, "PM2.5", pmat25, "ug/m3");
  sendValue(0x02, pmat25);

  // Read MQ9
  sensorValue = analogRead(MQ9PIN);
  sensorVolt = sensorValue / 1024 * 5.0;
  RS = (5.0 - sensorVolt) / sensorVolt;
  R0 = RS / 9.9;
  ratio = RS / R0;
  ppm = pow(10, (log10(ratio) * -2.6) + 2.7);
  showText(10, 250, "LPG", ppm, "ppm");
  sendValue(0x03, ppm);

  // Speech
  if (SPEECH_FLAG) {
    if (Speech.available()) {
      cmd = Speech.read();
      Serial.println("*********************************");
      Serial.println(voiceBuffer[cmd - 1]);
      Serial.println("*********************************");
      sendValue(0x04, cmd);
    }
  }

  //delay(5000);
}

void showText(int x, int y, char* caption, float value, char* unit) {
  tft.setCursor(x, y);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.println(caption);
  Serial.print(caption);
  Serial.print(": ");

  tft.setCursor(x, y + 20);
  tft.fillRect(x, y + 20, 145, 35, ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(5);
  tft.println(value);
  Serial.print(value);

  tft.setCursor(x + 155, y + 40);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.println(unit);
  Serial.print(" ");
  Serial.println(unit);
}

void sendValue(byte id, float value) {
  long v = (long) (value * 100);
  packet[0] = id;
  packet[1] = v >> 24 & 0xFF;
  packet[2] = v >> 16 & 0xFF;
  packet[3] = v >> 8 & 0xFF;
  packet[4] = v & 0xFF;
  Serial1.write(packet, 5);
}

