
void readG3(
    long &pmcf10,
    long &pmcf25,
    long &pmcf100,
    long &pmat10,
    long &pmat25,
    long &pmat100
  ) {
  Serial.println("readG3");
  int count = 0;

  // read buffer
  while (G3.available()) {
    unsigned char c = G3.read();
    unsigned char high;
    if((count == 0 && c != 0x42) || (count == 1 && c != 0x4D)) {
      Serial.println("check failed");
      break;
    }
    if (count > 15) {
      Serial.println("complete");
      break;
    } else if(count == 4 || count == 6 || count == 8 || count == 10 || count == 12 || count == 14) {
      high = c;
    } else if (count == 5) {
      pmcf10 = 256 * high + c;
      Serial.print("CF=1, PM1.0=");
      Serial.print(pmcf10);
      Serial.println(" ug/m3");
    } else if (count == 7) {
      pmcf25 = 256 * high + c;
      Serial.print("CF=1, PM2.5=");
      Serial.print(pmcf25);
      Serial.println(" ug/m3");
    } else if (count == 9) {
      pmcf100 = 256 * high + c;
      Serial.print("CF=1, PM10=");
      Serial.print(pmcf100);
      Serial.println(" ug/m3");
    } else if (count == 11) {
      pmat10 = 256 * high + c;
      Serial.print("atmosphere, PM1.0=");
      Serial.print(pmat10);
      Serial.println(" ug/m3");
    } else if (count == 13) {
      pmat25 = 256 * high + c;
      Serial.print("atmosphere, PM2.5=");
      Serial.print(pmat25);
      Serial.println(" ug/m3");
    } else if (count == 15) {
      pmat100 = 256 * high + c;
      Serial.print("atmosphere, PM10=");
      Serial.print(pmat100);
      Serial.println(" ug/m3");
    }
    count++;
  }

  // clean up the buffer
  while (G3.available()) {
    G3.read();
  }
  Serial.println("end readG3");
}

