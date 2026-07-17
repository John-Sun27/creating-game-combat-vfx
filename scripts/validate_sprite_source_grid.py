#!/usr/bin/env python3
"""Reject sprite-source grid cells whose meaningful pixels enter the safe margin.

This validator is intentionally dependency-free. It reads non-interlaced, 8-bit RGB/RGBA
PNG files, treats a configurable chroma key as transparent, and audits each source-grid
cell before the sheet is sliced into runtime frames.
"""

from __future__ import annotations

import argparse
import math
import struct
import sys
import zlib
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ValidationError(Exception):
    """Report an invalid image or command-line contract."""


def parse_color(value: str) -> tuple[int, int, int]:
    value = value.strip().lstrip("#")
    if len(value) != 6:
        raise argparse.ArgumentTypeError("chroma key must be six hexadecimal digits, for example ff00ff")
    try:
        return tuple(int(value[index : index + 2], 16) for index in range(0, 6, 2))  # type: ignore[return-value]
    except ValueError as error:
        raise argparse.ArgumentTypeError("chroma key must be hexadecimal") from error


def paeth(left: int, above: int, upper_left: int) -> int:
    predictor = left + above - upper_left
    left_distance = abs(predictor - left)
    above_distance = abs(predictor - above)
    upper_left_distance = abs(predictor - upper_left)
    if left_distance <= above_distance and left_distance <= upper_left_distance:
        return left
    if above_distance <= upper_left_distance:
        return above
    return upper_left


def read_png(path: Path) -> tuple[int, int, int, bytes]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValidationError(f"{path}: expected a PNG file")

    offset = len(PNG_SIGNATURE)
    width = height = bit_depth = color_type = interlace = None
    compressed_parts: list[bytes] = []
    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_start = offset + 8
        chunk_end = chunk_start + length
        if chunk_end + 4 > len(data):
            raise ValidationError(f"{path}: truncated PNG chunk")
        chunk_data = data[chunk_start:chunk_end]
        offset = chunk_end + 4
        if chunk_type == b"IHDR":
            if length != 13:
                raise ValidationError(f"{path}: invalid IHDR chunk")
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            compressed_parts.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if None in (width, height, bit_depth, color_type, interlace) or not compressed_parts:
        raise ValidationError(f"{path}: missing required PNG data")
    if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
        raise ValidationError(
            f"{path}: require non-interlaced 8-bit RGB or RGBA PNG (got depth={bit_depth}, colorType={color_type}, interlace={interlace})"
        )

    channels = 4 if color_type == 6 else 3
    stride = width * channels
    raw = zlib.decompress(b"".join(compressed_parts))
    expected = (stride + 1) * height
    if len(raw) != expected:
        raise ValidationError(f"{path}: unexpected pixel data length")

    rows = bytearray(stride * height)
    previous = bytearray(stride)
    raw_offset = 0
    for row_index in range(height):
        filter_type = raw[raw_offset]
        raw_offset += 1
        source = raw[raw_offset : raw_offset + stride]
        raw_offset += stride
        current = bytearray(stride)
        for index, value in enumerate(source):
            left = current[index - channels] if index >= channels else 0
            above = previous[index]
            upper_left = previous[index - channels] if index >= channels else 0
            if filter_type == 0:
                reconstructed = value
            elif filter_type == 1:
                reconstructed = (value + left) & 0xFF
            elif filter_type == 2:
                reconstructed = (value + above) & 0xFF
            elif filter_type == 3:
                reconstructed = (value + ((left + above) // 2)) & 0xFF
            elif filter_type == 4:
                reconstructed = (value + paeth(left, above, upper_left)) & 0xFF
            else:
                raise ValidationError(f"{path}: unsupported PNG filter {filter_type}")
            current[index] = reconstructed
        start = row_index * stride
        rows[start : start + stride] = current
        previous = current
    return width, height, channels, bytes(rows)


def pixel_is_visible(
    pixels: bytes,
    pixel_index: int,
    channels: int,
    chroma_key: tuple[int, int, int],
    chroma_distance: int,
    alpha_threshold: int,
) -> bool:
    red, green, blue = pixels[pixel_index : pixel_index + 3]
    alpha = pixels[pixel_index + 3] if channels == 4 else 255
    distance_sq = (red - chroma_key[0]) ** 2 + (green - chroma_key[1]) ** 2 + (blue - chroma_key[2]) ** 2
    if distance_sq <= chroma_distance * chroma_distance:
        return False
    distance = math.sqrt(distance_sq)
    if distance < 130:
        alpha = round(alpha * (distance - chroma_distance) / (130 - chroma_distance))
    value = max(red, green, blue)
    if value <= 32:
        return False
    if value < 80:
        alpha = round(alpha * (value - 32) / 48)
    is_dark_violet_card = value <= 118 and green <= 32 and red >= value * 0.68 and blue >= value * 0.62
    if is_dark_violet_card:
        return False
    return alpha > alpha_threshold


def audit_grid(
    width: int,
    height: int,
    channels: int,
    pixels: bytes,
    frames: int,
    columns: int,
    rows: int,
    safe_margin_percent: float,
    minimum_margin_pixels: int,
    chroma_key: tuple[int, int, int],
    chroma_distance: int,
    alpha_threshold: int,
) -> list[str]:
    issues: list[str] = []
    for frame in range(frames):
        row, column = divmod(frame, columns)
        left = math.floor(column * width / columns)
        right = math.floor((column + 1) * width / columns)
        top = math.floor(row * height / rows)
        bottom = math.floor((row + 1) * height / rows)
        cell_width = right - left
        cell_height = bottom - top
        margin_x = max(1, math.ceil(cell_width * safe_margin_percent))
        margin_y = max(1, math.ceil(cell_height * safe_margin_percent))
        counts = {"left": 0, "right": 0, "top": 0, "bottom": 0}

        for y in range(top, bottom):
            for x in range(left, right):
                pixel_index = (y * width + x) * channels
                if not pixel_is_visible(pixels, pixel_index, channels, chroma_key, chroma_distance, alpha_threshold):
                    continue
                local_x = x - left
                local_y = y - top
                if local_x < margin_x:
                    counts["left"] += 1
                if local_x >= cell_width - margin_x:
                    counts["right"] += 1
                if local_y < margin_y:
                    counts["top"] += 1
                if local_y >= cell_height - margin_y:
                    counts["bottom"] += 1

        for side, count in counts.items():
            if count >= minimum_margin_pixels:
                margin = margin_x if side in ("left", "right") else margin_y
                issues.append(
                    f"frame {frame} {side}: {count} foreground pixels inside the {margin}px safe margin (limit {minimum_margin_pixels - 1})"
                )
    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate that every source-grid cell has enough clean padding before sprite slicing."
    )
    parser.add_argument("--input", required=True, type=Path, help="Source PNG grid to inspect")
    parser.add_argument("--frames", required=True, type=int, help="Number of frames populated in row-major order")
    parser.add_argument("--columns", required=True, type=int, help="Number of source-grid columns")
    parser.add_argument("--rows", type=int, help="Number of source-grid rows; defaults to the minimum needed")
    parser.add_argument("--safe-margin-percent", type=float, default=0.12, help="Clean margin required on every side (default: 0.12)")
    parser.add_argument(
        "--minimum-margin-pixels",
        type=int,
        default=12,
        help="Visible pixels allowed in one margin band before rejection (default: 12)",
    )
    parser.add_argument("--chroma-key", type=parse_color, default=(255, 0, 255), help="Background chroma color (default: ff00ff)")
    parser.add_argument("--chroma-distance", type=int, default=65, help="Color distance treated as chroma background (default: 65)")
    parser.add_argument("--alpha-threshold", type=int, default=12, help="Alpha at or below this value is empty (default: 12)")
    args = parser.parse_args()
    if args.frames < 1 or args.columns < 1:
        parser.error("frames and columns must be positive")
    args.rows = args.rows or math.ceil(args.frames / args.columns)
    if args.rows < 1 or args.frames > args.rows * args.columns:
        parser.error("rows and columns cannot hold the requested number of frames")
    if not 0 < args.safe_margin_percent < 0.5:
        parser.error("safe-margin-percent must be between 0 and 0.5")
    if args.minimum_margin_pixels < 1 or args.chroma_distance < 0 or not 0 <= args.alpha_threshold <= 255:
        parser.error("margin, chroma distance, and alpha threshold are out of range")
    return args


def main() -> int:
    args = parse_args()
    try:
        width, height, channels, pixels = read_png(args.input)
        issues = audit_grid(
            width,
            height,
            channels,
            pixels,
            args.frames,
            args.columns,
            args.rows,
            args.safe_margin_percent,
            args.minimum_margin_pixels,
            args.chroma_key,
            args.chroma_distance,
            args.alpha_threshold,
        )
    except (OSError, ValidationError, zlib.error) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    if issues:
        print(f"FAIL: {args.input.name} has {len(issues)} safe-margin violation(s).", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        return 2
    print(
        f"PASS: {args.input.name} — {args.frames} frame(s), {args.columns} column(s), {args.rows} row(s), "
        f"{args.safe_margin_percent:.0%} clean margin."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
