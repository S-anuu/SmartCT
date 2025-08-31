import sys
import json
from pathlib import Path
import torch
import numpy as np
import random
import zipfile
import tempfile
import shutil
import logging
from preprocessing import convert_dicom_to_nifti, test_transforms, RSNADataset, verify_dicom_files
from model import DenseNet121model
import nibabel as nib
import os
# Add these near the top of inference.py
import torch
from functools import partial
from typing import List, Callable

# TTA Functions
def id_fn(x):       # identity
    return x

def flip0(x):       # flip depth
    return torch.flip(x, dims=[2])

def flip1(x):       # flip height
    return torch.flip(x, dims=[3])

def flip2(x):       # flip width
    return torch.flip(x, dims=[4])

def rot90_hw(x):    # rotate 90 over H-W (axes 3,4)
    return torch.rot90(x, k=1, dims=(3, 4))

DEFAULT_TTA_FNS = [id_fn, flip0, flip1, flip2]

# Custom Thresholds Configuration
CUSTOM_THRESHOLDS = {
    "bowel": {"thresholds": [0.45]},  # Single threshold for binary
    "extra": {"thresholds": [0.78]},
    "kidney": {"thresholds": [0.06, 0.75, 0.67]},  # Three for multi-class
    "liver": {"thresholds": [0.15, 0.55, 0.75]},
    "spleen": {"thresholds": [0.12, 0.50, 0.55]}
}

def _tta_forward_batch(model, inputs, tta_fns: List[Callable] = None):
    """Run a batch through the model with multiple deterministic TTA transforms"""
    if not tta_fns:
        return model(inputs)

    logits_per_tta = []
    for fn in tta_fns:
        aug_inp = fn(inputs)
        logits_per_tta.append(model(aug_inp))

    # Average per-head
    avg_logits = {}
    for k in logits_per_tta[0].keys():
        avg_logits[k] = torch.stack([d[k] for d in logits_per_tta], dim=0).mean(dim=0)
    return avg_logits

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)
random.seed(42)

def load_model(model_path):
    """Load and prepare the model with proper error handling"""
    logger.info(f"Loading model weights from: {model_path}")
    try:
        model = DenseNet121model()
        state_dict = torch.load(model_path, map_location='cpu', weights_only=False)
        
        if 'model_state_dict' in state_dict:
            state_dict = state_dict['model_state_dict']
        
        # Filter out unnecessary keys
        state_dict = {k: v for k, v in state_dict.items() 
                     if not k.endswith('num_batches_tracked')}
        
        model.load_state_dict(state_dict, strict=False)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Model loading failed: {str(e)}")
        raise RuntimeError(f"Model loading failed: {str(e)}")

def postprocess_output(outputs, thresholds=None):
    """Updated to handle thresholds properly"""
    # Default thresholds if none provided
    if thresholds is None:
        thresholds = {
            "bowel": {"thresholds": [0.5]},  # Single threshold for binary classification
            "extra": {"thresholds": [0.5]},
            "liver": {"thresholds": [0.33, 0.33, 0.33]},  # Equal thresholds for multi-class
            "kidney": {"thresholds": [0.33, 0.33, 0.33]},
            "spleen": {"thresholds": [0.33, 0.33, 0.33]}
        }
    elif isinstance(thresholds, dict):
        # Ensure each organ has proper threshold structure
        for organ in ["bowel", "extra", "liver", "kidney", "spleen"]:
            if organ not in thresholds:
                if organ in ["bowel", "extra"]:
                    thresholds[organ] = {"thresholds": [0.5]}
                else:
                    thresholds[organ] = {"thresholds": [0.33, 0.33, 0.33]}
    
    results = {}

    # Binary classifications
    bowel_prob = torch.sigmoid(outputs["bowel"].squeeze()).item()
    bowel_threshold = thresholds["bowel"]["thresholds"][0]  # Get first threshold
    bowel_label = "Injured" if bowel_prob >= bowel_threshold else "Healthy"

    extra_prob = torch.sigmoid(outputs["extra"].squeeze()).item()
    extra_threshold = thresholds["extra"]["thresholds"][0]
    extra_label = "Present" if extra_prob >= extra_threshold else "Absent"

    results.update({
        "bowel": {
            "status": bowel_label,
            "confidence": float(bowel_prob if bowel_label == "Injured" else 1 - bowel_prob),
            "probability": float(bowel_prob)
        },
        "extravasation": {
            "status": extra_label,
            "confidence": float(extra_prob if extra_label == "Present" else 1 - extra_prob),
            "probability": float(extra_prob)
        }
    })

    # Multi-class classifications
    organ_status_map = {
        "liver": ["Healthy", "Low Injury", "High Injury"],
        "kidney": ["Healthy", "Low Injury", "High Injury"],
        "spleen": ["Healthy", "Low Injury", "High Injury"]
    }

    severity_map = ["normal", "low", "high"]

    for organ in ["liver", "kidney", "spleen"]:
        probs = torch.softmax(outputs[organ].squeeze(), dim=0).cpu().numpy()
        organ_thresholds = thresholds[organ]["thresholds"]
        
        # Apply thresholds
        valid_classes = []
        for class_idx, threshold in enumerate(organ_thresholds):
            if probs[class_idx] >= threshold:
                valid_classes.append(class_idx)
        
        if valid_classes:
            pred_class = valid_classes[np.argmax(probs[valid_classes])]
        else:
            pred_class = 0  # Default to healthy

        results[organ] = {
            "status": organ_status_map[organ][pred_class],
            "severity": severity_map[pred_class],
            "confidence": float(probs[pred_class]),
            "probabilities": [float(p) for p in probs]
        }

    return results

def process_dicom_zip(zip_path, temp_dir):
    """More robust ZIP extraction with DICOM validation"""
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Extract all files first
            zip_ref.extractall(temp_dir)
            
            # Find DICOM files recursively
            dcm_files = []
            for root, _, files in os.walk(temp_dir):
                for f in files:
                    file_path = os.path.join(root, f)
                    try:
                        # Quick check if file is DICOM
                        with open(file_path, 'rb') as fp:
                            fp.seek(128)
                            if fp.read(4) == b'DICM':
                                dcm_files.append(file_path)
                    except:
                        continue
            
            if not dcm_files:
                raise ValueError("No valid DICOM files found in ZIP archive")
                
            return temp_dir
    except Exception as e:
        logger.error(f"ZIP processing failed: {str(e)}")
        raise RuntimeError(f"ZIP processing failed: {str(e)}")


def run_inference(scan_path, model, device='cpu', tta_fns=None, thresholds=None):
    temp_dir = None
    try:
        scan_path = Path(scan_path).absolute()
        
        # Handle ZIP files (if needed)
        if str(scan_path).endswith('.zip'):
            temp_dir = tempfile.mkdtemp()
            with zipfile.ZipFile(scan_path, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
            scan_path = Path(temp_dir)
        
        # Handle NIfTI input directly
        if not scan_path.is_dir():
            try:
                # First try normal loading
                test_load = nib.load(str(scan_path))
            except Exception as e:
                logger.warning(f"Initial NIfTI load failed, attempting repair: {str(e)}")
                # Attempt repair if normal load fails
                if temp_dir:
                    repaired_path = Path(temp_dir) / "repaired.nii.gz"
                else:
                    repaired_path = scan_path.parent / f"repaired_{scan_path.name}"
                
                repair_nifti(scan_path, repaired_path)
                scan_path = repaired_path
        
        # Handle DICOM directory input
        else:
            try:
                valid_files = verify_dicom_files(scan_path)
                logger.info(f"Found {len(valid_files)} valid DICOM files")
            except Exception as e:
                raise RuntimeError(f"DICOM verification failed: {str(e)}")
            
            # Convert to NIfTI
            converted_path = convert_dicom_to_nifti(
                scan_path, 
                Path(temp_dir) / "converted.nii.gz" if temp_dir else scan_path.parent / "converted.nii.gz"
            )
            scan_path = converted_path

        # Verify output exists
        if not scan_path.exists():
            raise FileNotFoundError(f"Processed scan not found: {scan_path}")

        # Create dataset entry
        metadata_entry = {
            "nifti_path": str(scan_path),
            "labels": {
                "bowel_injury": 0, "extravasation_injury": 0,
                "kidney_healthy": 1, "kidney_low": 0, "kidney_high": 0,
                "liver_healthy": 1, "liver_low": 0, "liver_high": 0,
                "spleen_healthy": 1, "spleen_low": 0, "spleen_high": 0
            }
        }
        
        # Run inference
        temp_dataset = RSNADataset(
            metadata_list=[metadata_entry],
            transforms=test_transforms,
            has_labels=False
        )
        
        sample = temp_dataset[0]
        input_tensor = sample["image"].unsqueeze(0).to(device)
        
        with torch.no_grad():
            if tta_fns:
                outputs = _tta_forward_batch(model, input_tensor, tta_fns)
            else:
                outputs = model(input_tensor)
        
        return postprocess_output(outputs, thresholds)
        
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception as e:
                logger.warning(f"Failed to clean temp dir: {str(e)}")

def main():
    try:
        if len(sys.argv) < 3:
            raise ValueError("Usage: inference.py <scan_path> <model_path> [--tta] [--thresholds]")
        
        scan_path = Path(sys.argv[1])
        model_path = Path(sys.argv[2])
        
        # Parse optional arguments
        use_tta = "--tta" in sys.argv
        use_custom_thresholds = "--thresholds" in sys.argv
        
        if not scan_path.exists():
            raise FileNotFoundError(f"Scan path does not exist: {scan_path}")
        if not model_path.exists():
            raise FileNotFoundError(f"Model path does not exist: {model_path}")
        
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {device}")
        
        model = load_model(model_path).to(device)
        
        # Configure TTA and thresholds
        tta_fns = DEFAULT_TTA_FNS if use_tta else None
        thresholds = CUSTOM_THRESHOLDS if use_custom_thresholds else None
        
        results = run_inference(
            scan_path, 
            model, 
            device,
            tta_fns=tta_fns,
            thresholds=thresholds
        )
        
        print(json.dumps(results))
        
    except Exception as e:
        error_msg = {
            "error": str(e),
            "type": type(e).__name__
        }
        logger.error(json.dumps(error_msg))
        print(json.dumps(error_msg), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()