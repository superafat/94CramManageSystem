#!/bin/bash
# Download face-api.js model files
set -e
MODELS_DIR="$(dirname "$0")/../models"
mkdir -p "$MODELS_DIR"
BASE="https://raw.githubusercontent.com/vladmandic/face-api/master/model"

for f in \
  "ssd_mobilenetv1_model-weights_manifest.json" \
  "ssd_mobilenetv1_model.bin" \
  "face_landmark_68_model-weights_manifest.json" \
  "face_landmark_68_model.bin" \
  "face_recognition_model-weights_manifest.json" \
  "face_recognition_model.bin"
do
  echo "Downloading $f..."
  curl -fsSL "$BASE/$f" -o "$MODELS_DIR/$f"
done
echo "✅ Models downloaded to $MODELS_DIR"
