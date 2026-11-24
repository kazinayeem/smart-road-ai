import numpy as np
from PIL import Image, ImageDraw
import onnxruntime as ort
import json

def nms(boxes, scores, iou_threshold=0.45):
    """Standard Non-Maximum Suppression"""
    if len(boxes) == 0:
        return []
    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]
    return keep

def classify_severity(area_ratio, confidence):
    """
    Deterministic rule-based severity:
    - High: Area ratio >= 0.08 OR (confidence >= 0.85 AND area_ratio >= 0.04)
    - Medium: Area ratio >= 0.03
    - Low: Area ratio < 0.03
    """
    if area_ratio >= 0.08 or (confidence >= 0.85 and area_ratio >= 0.04):
        return "HIGH"
    elif area_ratio >= 0.03:
        return "MEDIUM"
    else:
        return "LOW"

def run_pothole_inference(model_path, image_path, conf_thresh=0.25, iou_thresh=0.45):
    session = ort.InferenceSession(model_path)
    input_name = session.get_inputs()[0].name
    
    # Preprocess
    orig_img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = orig_img.size
    
    resized = orig_img.resize((640, 640))
    img_data = np.array(resized, dtype=np.float32) / 255.0
    img_data = np.transpose(img_data, (2, 0, 1))
    img_data = np.expand_dims(img_data, axis=0)
    
    # Infer
    preds = session.run(None, {input_name: img_data})[0] # [1, 5, 8400]
    preds = preds[0] # [5, 8400]
    
    # Parse YOLOv8 outputs: [cx, cy, w, h, conf]
    cx = preds[0, :]
    cy = preds[1, :]
    w = preds[2, :]
    h = preds[3, :]
    conf = preds[4, :]
    
    mask = conf >= conf_thresh
    cx, cy, w, h, conf = cx[mask], cy[mask], w[mask], h[mask], conf[mask]
    
    if len(conf) == 0:
        return {"detections": [], "image_size": [orig_w, orig_h]}
        
    x1 = np.clip(cx - w / 2, 0, 640)
    y1 = np.clip(cy - h / 2, 0, 640)
    x2 = np.clip(cx + w / 2, 0, 640)
    y2 = np.clip(cy + h / 2, 0, 640)
    
    boxes = np.stack([x1, y1, x2, y2], axis=1)
    keep_indices = nms(boxes, conf, iou_thresh)
    
    results = []
    for idx in keep_indices:
        b = boxes[idx]
        c = float(conf[idx])
        box_w = float(b[2] - b[0])
        box_h = float(b[3] - b[1])
        area_ratio = float((box_w * box_h) / (640.0 * 640.0))
        severity = classify_severity(area_ratio, c)
        
        # Scale coords back to original image
        scale_x = orig_w / 640.0
        scale_y = orig_h / 640.0
        orig_bbox = [
            round(b[0] * scale_x, 1),
            round(b[1] * scale_y, 1),
            round(b[2] * scale_x, 1),
            round(b[3] * scale_y, 1)
        ]
        
        results.append({
            "bbox_normalized": [round(b[0]/640, 4), round(b[1]/640, 4), round(b[2]/640, 4), round(b[3]/640, 4)],
            "bbox_pixels": orig_bbox,
            "confidence": round(c, 4),
            "area_ratio": round(area_ratio, 4),
            "severity": severity,
            "class": "pothole"
        })
        
    return {
        "detections": results,
        "image_size": [orig_w, orig_h]
    }

if __name__ == "__main__":
    model_path = "ai-model/exported/pothole_yolov8s.onnx"
    test_img = "ai-model/evaluation/test_road.jpg"
    print(f"Testing pipeline with ONNX model: {model_path} on {test_img}")
    res = run_pothole_inference(model_path, test_img)
    print("Inference result:")
    print(json.dumps(res, indent=2))
