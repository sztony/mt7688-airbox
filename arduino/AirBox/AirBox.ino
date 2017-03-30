#include <SoftwareSerial.h>

// TFT
#include "SPI.h"
#include "Adafruit_GFX.h"
#include "Adafruit_ILI9341.h"

// DHT22
#include "DHT.h"

// TFT
#define TFT_RST 8
#define TFT_DC 9
#define TFT_CS 10
#define TFT_MOSI 11
#define TFT_MISO 12
#define TFT_CLK 13

// DHT22
#define DHTTYPE DHT22
#define DHTPIN 7

// G3
#define G3_RX 14
#define G3_TX 15

// MQ9
#define MQ9PIN 23

// TFT
Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_MOSI, TFT_CLK, TFT_RST, TFT_MISO);

// DHT22
DHT dht(DHTPIN, DHTTYPE);

// G3
SoftwareSerial G3(G3_RX, G3_TX);

void setup() {
  tft.begin();
  dht.begin();
  G3.begin(9600);

  // Debug Serial
  Serial.begin(9600);

  // Initial TFT Screen
  tft.fillScreen(ILI9341_BLACK);
}

void loop() {

  // Read humidity
  float humidity = dht.readHumidity();
  showText(10, 10, "Humidity", humidity, "%");

  // Read temperature as Celsius
  float temperature = dht.readTemperature();
  showText(10, 90, "Temperature", temperature, "C");

  // Read G3 PM2.5
  long pmcf10 = 0;
  long pmcf25 = 0;
  long pmcf100 = 0;
  long pmat10 = 0;
  long pmat25 = 0;
  long pmat100 = 0;
  readG3(pmcf10, pmcf25, pmcf100, pmat10, pmat25, pmat100);
  showText(10, 170, "PM2.5", pmat25, "ug/m3");

  // Read MQ9
  float sensorValue = analogRead(MQ9PIN);
  float sensorVolt = sensorValue / 1024 * 5.0;
  showText(10, 250, "Smoke", sensorVolt, "V");

  delay(2000);
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

