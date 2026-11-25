#!/usr/bin/env bash
set -e

echo "========================================="
echo " Building Fullstack App for Wasmer Edge"
echo "========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"

# 1. Build Frontend directly into public/
echo ""
echo "[1/3] Building React Frontend with Vite..."
cd "$SCRIPT_DIR"
npm run build

# 2. Verify Built Public Assets
echo ""
echo "[2/3] Verifying compiled assets in Laravel public directory..."
if [ -f "$PUBLIC_DIR/index.html" ] && [ -d "$PUBLIC_DIR/assets" ]; then
    echo "  -> Verified index.html and assets/ in $PUBLIC_DIR"
else
    echo "Error: Compiled frontend assets were not generated in $PUBLIC_DIR." >&2
    exit 1
fi

# 3. Validation
echo ""
echo "[3/3] Validating Wasmer configuration..."
if [ -f "$SCRIPT_DIR/wasmer.toml" ] && [ -f "$SCRIPT_DIR/app.yaml" ]; then
    echo "  -> wasmer.toml and app.yaml verified in $SCRIPT_DIR"
fi

echo ""
echo "========================================="
echo " Build Complete & Ready for Wasmer Deploy!"
echo " Run the following from the project root to deploy to Wasmer Edge:"
echo "   wasmer deploy"
echo "========================================="
