import os
import torch
from ultralytics import YOLO

model_path = "ai-model/original/best.pt"
print(f"Model file size: {os.path.getsize(model_path) / (1024 * 1024):.2f} MB")

try:
    model = YOLO(model_path)
    print("\n--- Model Information ---")
    print(f"Task: {model.task}")
    print(f"Classes: {model.names}")
    print(f"Number of classes: {len(model.names)}")
    if hasattr(model, 'model') and model.model is not None:
        print(f"Model Architecture: {type(model.model).__name__}")
        total_params = sum(p.numel() for p in model.model.parameters())
        print(f"Total Parameters: {total_params:,}")
        
    print("\nModel inspection successful!")
except Exception as e:
    print(f"Error loading model: {e}")
