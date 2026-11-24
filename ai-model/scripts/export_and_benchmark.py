import os
import time
import json
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO
import onnx
import onnxruntime as ort

os.makedirs("ai-model/exported", exist_ok=True)
os.makedirs("ai-model/optimized", exist_ok=True)
os.makedirs("ai-model/evaluation", exist_ok=True)

model_path = "ai-model/original/best.pt"
print(f"--- 1. Loading Original Model: {model_path} ---")
pt_model = YOLO(model_path)
pt_size_mb = os.path.getsize(model_path) / (1024 * 1024)
print(f"Original PyTorch model size: {pt_size_mb:.2f} MB")

# Export to ONNX (FP32)
print("\n--- 2. Exporting to ONNX (Standard FP32) ---")
onnx_exported = pt_model.export(format="onnx", imgsz=640, dynamic=False, simplify=True)
onnx_dest = "ai-model/exported/pothole_yolov8s.onnx"
if os.path.exists(onnx_exported):
    os.rename(onnx_exported, onnx_dest)
print(f"Saved ONNX model to: {onnx_dest}")
onnx_size_mb = os.path.getsize(onnx_dest) / (1024 * 1024)
print(f"ONNX Model size: {onnx_size_mb:.2f} MB")

# Inspect ONNX Model
model_proto = onnx.load(onnx_dest)
print("\n--- 3. ONNX Model Architecture & Tensors ---")
session = ort.InferenceSession(onnx_dest)
input_info = session.get_inputs()[0]
output_info = session.get_outputs()[0]

print(f"Input Name: {input_info.name}")
print(f"Input Shape: {input_info.shape}")
print(f"Input Type: {input_info.type}")
print(f"Output Name: {output_info.name}")
print(f"Output Shape: {output_info.shape}")
print(f"Output Type: {output_info.type}")

# Create a test synthetic road image with a simulated pothole
test_img_path = "ai-model/evaluation/test_road.jpg"
img_w, img_h = 640, 640
img_array = np.full((img_h, img_w, 3), 120, dtype=np.uint8)
# Add simulated road lines and pothole
img_array[300:500, 200:440] = 30  # dark patch representing pothole
test_img = Image.fromarray(img_array)
test_img.save(test_img_path)

# Benchmark PyTorch Inference
print("\n--- 4. Benchmarking PyTorch Inference ---")
# Warmup
for _ in range(5):
    _ = pt_model(test_img_path, verbose=False)

pt_times = []
for _ in range(30):
    t0 = time.perf_counter()
    res = pt_model(test_img_path, verbose=False)
    pt_times.append((time.perf_counter() - t0) * 1000)
avg_pt_time = np.mean(pt_times)
p95_pt_time = np.percentile(pt_times, 95)
print(f"PyTorch Average Latency: {avg_pt_time:.2f} ms (p95: {p95_pt_time:.2f} ms)")

# Benchmark ONNX Runtime Inference
print("\n--- 5. Benchmarking ONNX Runtime Inference ---")
# Preprocessing
raw_img = Image.open(test_img_path).convert("RGB").resize((640, 640))
input_tensor = np.array(raw_img, dtype=np.float32) / 255.0
input_tensor = np.transpose(input_tensor, (2, 0, 1))  # HWC -> CHW
input_tensor = np.expand_dims(input_tensor, axis=0)   # BCHW: [1, 3, 640, 640]

# Warmup
for _ in range(5):
    _ = session.run([output_info.name], {input_info.name: input_tensor})

ort_times = []
for _ in range(30):
    t0 = time.perf_counter()
    ort_outs = session.run([output_info.name], {input_info.name: input_tensor})
    ort_times.append((time.perf_counter() - t0) * 1000)
avg_ort_time = np.mean(ort_times)
p95_ort_time = np.percentile(ort_times, 95)
print(f"ONNX Runtime Average Latency: {avg_ort_time:.2f} ms (p95: {p95_ort_time:.2f} ms)")

# Check Output Tensor Shape & Values
out_tensor = ort_outs[0]
print(f"Inference Output shape: {out_tensor.shape}") # Expect [1, 5, 8400] for 1 class (cx, cy, w, h, conf)

# Generate INT8 Dynamic Quantization for Mobile
print("\n--- 6. Creating Dynamic Quantized Model for Android Mobile ---")
try:
    from onnxruntime.quantization import quantize_dynamic, QuantType
    quant_dest = "ai-model/optimized/pothole_yolov8s_quant_int8.onnx"
    quantize_dynamic(onnx_dest, quant_dest, weight_type=QuantType.QUInt8)
    quant_size_mb = os.path.getsize(quant_dest) / (1024 * 1024)
    print(f"INT8 Quantized Model saved: {quant_dest} ({quant_size_mb:.2f} MB)")
    
    # Benchmark Quantized Model
    quant_session = ort.InferenceSession(quant_dest)
    for _ in range(5):
        _ = quant_session.run([output_info.name], {input_info.name: input_tensor})
    q_times = []
    for _ in range(30):
        t0 = time.perf_counter()
        _ = quant_session.run([output_info.name], {input_info.name: input_tensor})
        q_times.append((time.perf_counter() - t0) * 1000)
    avg_q_time = np.mean(q_times)
    print(f"INT8 Quantized Average Latency: {avg_q_time:.2f} ms")
except Exception as e:
    print(f"Quantization note: {e}")
    quant_dest = None
    quant_size_mb = None
    avg_q_time = None

report = {
    "model_name": "YOLOv8 Pothole Detector",
    "source": "https://huggingface.co/peterhdd/pothole-detection-yolov8",
    "architecture": "YOLOv8 DetectionModel (Single Class: Pothole)",
    "input_resolution": [1, 3, 640, 640],
    "output_shape": list(out_tensor.shape),
    "classes": ["pothole"],
    "metrics": {
        "pytorch_fp32": {
            "size_mb": round(pt_size_mb, 2),
            "avg_latency_ms": round(avg_pt_time, 2),
            "p95_latency_ms": round(p95_pt_time, 2)
        },
        "onnx_fp32": {
            "size_mb": round(onnx_size_mb, 2),
            "avg_latency_ms": round(avg_ort_time, 2),
            "p95_latency_ms": round(p95_ort_time, 2),
            "mobile_compatible": True,
            "runtime": "ONNX Runtime Mobile"
        }
    }
}
if quant_dest and os.path.exists(quant_dest):
    report["metrics"]["onnx_int8_quantized"] = {
        "size_mb": round(quant_size_mb, 2),
        "avg_latency_ms": round(avg_q_time, 2),
        "size_reduction_percent": round((1 - quant_size_mb / onnx_size_mb) * 100, 1),
        "mobile_compatible": True
    }

with open("ai-model/evaluation/benchmark_report.json", "w") as f:
    json.dump(report, f, indent=2)

print("\nBenchmark completed and saved to ai-model/evaluation/benchmark_report.json")
