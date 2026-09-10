#!/usr/bin/env python3
"""
ONNX Export Script for Gustking Wav2Vec2-XLSR Deepfake Audio Classification Model.

Exports the Hugging Face model to ONNX with dynamic axes along the sequence-length
dimension to support variable-duration streaming audio frames (e.g. 50ms = 800 samples,
500ms = 8000 samples).
"""

import argparse
import logging
import os
import sys

import numpy as np
import onnxruntime as ort
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("export_gustking_onnx")


def export_to_onnx(
    model_name: str = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification",
    output_path: str = "models/gustking_wav2vec2_deepfake.onnx",
    opset_version: int = 14,
    check_onnx: bool = True,
    device: str = "cpu",
) -> str:
    """Exports HuggingFace Wav2Vec2 deepfake model to ONNX with dynamic sequence-length axes."""
    logger.info(f"Loading pretrained model and feature extractor from '{model_name}'...")
    feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
    model = AutoModelForAudioClassification.from_pretrained(model_name)
    model.to(device)
    model.eval()

    logger.info(f"Model architectures: {getattr(model.config, 'architectures', None)}")
    logger.info(f"Model id2label mapping: {getattr(model.config, 'id2label', None)}")

    # Ensure target output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Prepare dummy input: 1-second audio frame (16,000 samples)
    dummy_audio = np.zeros(16000, dtype=np.float32)
    inputs = feature_extractor(dummy_audio, sampling_rate=16000, return_tensors="pt")
    dummy_input_values = inputs.input_values.to(device)

    # Define dynamic axes for sequence length and batch dimension
    dynamic_axes = {
        "input_values": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size"},
    }

    logger.info(f"Exporting model to ONNX at '{output_path}' (opset={opset_version})...")
    logger.info("Dynamic axes configuration: input_values[batch_size, sequence_length], logits[batch_size]")

    with torch.no_grad():
        ref_pytorch_out = model(dummy_input_values).logits.cpu().numpy()

        torch.onnx.export(
            model,
            dummy_input_values,
            output_path,
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=["input_values"],
            output_names=["logits"],
            dynamic_axes=dynamic_axes,
        )

    logger.info(f"Successfully exported ONNX model to: {output_path}")

    if check_onnx:
        logger.info("Validating exported ONNX model with ONNX Runtime...")
        session = ort.InferenceSession(output_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        logger.info(f"ONNX Session inputs: {[inp.name for inp in session.get_inputs()]}")
        logger.info(f"ONNX Session outputs: {[out.name for out in session.get_outputs()]}")

        # Test 1: Validate numerical consistency on 16000 samples
        ort_out = session.run([output_name], {input_name: dummy_input_values.cpu().numpy()})[0]
        np.testing.assert_allclose(ref_pytorch_out, ort_out, rtol=1e-3, atol=1e-4)
        logger.info("Test 1 Passed: PyTorch and ONNX outputs match within numerical tolerance.")

        # Test 2: Validate variable-length streaming frame (50ms = 800 samples)
        test_frame_50ms = np.random.randn(1, 800).astype(np.float32)
        ort_out_50ms = session.run([output_name], {input_name: test_frame_50ms})[0]
        assert ort_out_50ms.shape == (1, 2), f"Unexpected output shape: {ort_out_50ms.shape}"
        logger.info("Test 2 Passed: Dynamic axes on variable-length sequence (50ms frame) validated successfully.")

        # Test 3: Validate longer temporal frame (300ms = 4800 samples)
        test_frame_300ms = np.random.randn(1, 4800).astype(np.float32)
        ort_out_300ms = session.run([output_name], {input_name: test_frame_300ms})[0]
        assert ort_out_300ms.shape == (1, 2), f"Unexpected output shape: {ort_out_300ms.shape}"
        logger.info("Test 3 Passed: Dynamic axes on 300ms frame validated successfully.")

        logger.info("All ONNX validation tests passed successfully!")

    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Gustking Wav2Vec2 Deepfake model to ONNX")
    parser.add_argument(
        "--model-name",
        type=str,
        default="Gustking/wav2vec2-large-xlsr-deepfake-audio-classification",
        help="HuggingFace model ID or local directory",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="models/gustking_wav2vec2_deepfake.onnx",
        help="Target path for the exported ONNX model",
    )
    parser.add_argument(
        "--opset",
        type=int,
        default=14,
        help="ONNX opset version (default: 14)",
    )
    parser.add_argument(
        "--no-check",
        action="store_true",
        help="Skip verification with ONNX Runtime",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="cpu",
        help="Device to use for export (default: cpu)",
    )
    args = parser.parse_args()

    export_to_onnx(
        model_name=args.model_name,
        output_path=args.output,
        opset_version=args.opset,
        check_onnx=not args.no_check,
        device=args.device,
    )


if __name__ == "__main__":
    main()
