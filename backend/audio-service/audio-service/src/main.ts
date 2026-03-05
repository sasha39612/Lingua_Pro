{
  "name": "audio-service",
  "version": "1.0.0",
  "description": "Audio service for the Lingua project",
  "main": "src/main.ts",
  "scripts": {
    "start": "ts-node src/main.ts",
    "build": "tsc",
    "start:prod": "node dist/main.js"
  },
  "dependencies": {
    "@nestjs/common": "^9.0.0",
    "@nestjs/core": "^9.0.0",
    "dotenv": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.0.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^9.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^4.5.0"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "license": "MIT"
}