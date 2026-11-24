# AI Model Analysis & Mobile Optimization Report

## 1. Original Pretrained Model Overview
- **Source**: `https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt`
- **Architecture**: Ultralytics YOLOv8s (DetectionModel)
- **Parameters**: 11,125,971 (11.13M)
- **Original Weights Format**: PyTorch Checkpoint (`best.pt`, 21.48 MB)
- **Trained Classes**: 1 class (`0`: `pothole`)
- **Computational Complexity**: 28.4 GFLOPs at 640x640 resolution

## 2. Model Optimization & Export Pipeline
For mobile and edge deployment, the model was converted to open standard Open Neural Network Exchange (ONNX) format with topological slimming via `onnxslim` and quantized for edge runtime:

1. **Standard ONNX Model (`pothole_yolov8s.onnx`)**:
   - Size: 42.67 MB
   - Input shape: `images: [1, 3, 640, 640]` float32 (RGB normalized to [0.0, 1.0])
   - Output shape: `output0: [1, 5, 8400]` float32
   - Anchor grid: 8,400 multi-scale candidate detections
   - Output channels per anchor: `[center_x, center_y, width, height, pothole_confidence]`

2. **Mobile INT8 Quantized Model (`pothole_yolov8s_quant_int8.onnx`)**:
   - Size: 10.96 MB (**74.3% size reduction**)
   - Weight quantization: UInt8/Int8 dynamic quantization
   - Ideal for low-memory Android mobile devices

## 3. Latency Benchmarks (Apple Silicon M4 & Mobile Reference)
| Format | Weights Size | Avg Latency | P95 Latency | Mobile Runtime |
|---|---|---|---|---|
| PyTorch FP32 (`best.pt`) | 21.48 MB | 62.33 ms | 79.45 ms | Desktop / Server |
| **ONNX FP32** (`pothole_yolov8s.onnx`) | 42.67 MB | **47.55 ms** | 53.86 ms | **ONNX Runtime Mobile (Android)** |
| **ONNX INT8** (`pothole_yolov8s_quant_int8.onnx`) | **10.96 MB** | 76.91 ms | 88.20 ms | **ONNX Runtime Mobile (Low RAM)** |

## 4. Mobile Inference Pipeline Architecture
1. **Preprocessing**:
   - Convert CameraX / Gallery Bitmap to 640x640 RGB.
   - Normalize pixels: `pixel / 255.0f`.
   - Transpose from `HWC` (Bitmap) to `CHW` (Tensor shape `[1, 3, 640, 640]`).
2. **Inference**:
   - Feed tensor to ONNX Runtime Android Session.
   - Extract raw tensor of shape `[1, 5, 8400]`.
3. **Postprocessing & NMS**:
   - Filter candidates with `confidence >= 0.25`.
   - Convert center coordinates `[cx, cy, w, h]` to bounding box `[x1, y1, x2, y2]`.
   - Apply Non-Maximum Suppression (IoU threshold = 0.45).
4. **Severity Classification**:
   - Normalized Bounding Box Area Ratio: `(w * h) / (640 * 640)`.
   - **HIGH Severity**: Area Ratio $\ge 0.08$ OR (Confidence $\ge 0.85$ AND Area Ratio $\ge 0.04$).
   - **MEDIUM Severity**: Area Ratio $\ge 0.03$.
   - **LOW Severity**: Area Ratio $< 0.03$.
