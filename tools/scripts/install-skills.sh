#!/usr/bin/env bash
# Install xybrid Claude Code skills into your project.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/xybrid-ai/xybrid/master/tools/scripts/install-skills.sh | sh
#
# Or run directly:
#   ./install-skills.sh
#
# This adds /xybrid-init and /test-model commands to your Claude Code session.

set -euo pipefail

REPO="xybrid-ai/xybrid"
BRANCH="master"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"
TARGET_DIR=".claude/commands"

SKILLS=(
  "xybrid-init.md"
  "test-model.md"
)

echo "Installing xybrid Claude Code skills..."
echo ""

mkdir -p "${TARGET_DIR}"

for skill in "${SKILLS[@]}"; do
  url="${BASE_URL}/.claude/commands/${skill}"
  dest="${TARGET_DIR}/${skill}"

  if [ -f "${dest}" ]; then
    echo "  Updating ${skill}..."
  else
    echo "  Installing ${skill}..."
  fi

  if command -v curl &> /dev/null; then
    curl -sSL "${url}" -o "${dest}"
  elif command -v wget &> /dev/null; then
    wget -q "${url}" -O "${dest}"
  else
    echo "Error: curl or wget is required" >&2
    exit 1
  fi
done

echo ""
echo "Done! Skills installed to ${TARGET_DIR}/"
echo ""
echo "Available commands:"
echo "  /xybrid-init    Generate model_metadata.json for any ML model"
echo "  /test-model     Test a model end-to-end with xybrid"
echo ""
echo "Quick start:"
echo "  claude /xybrid-init hexgrad/Kokoro-82M-v1.0-ONNX"
