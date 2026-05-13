#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  TERRA COMPUTE - GitHub Upload Helper Script
#  Run this script to upload the game to your GitHub repository
# ═══════════════════════════════════════════════════════════════

set -e

REPO_URL="https://github.com/Agnuxo1/TERRA_COMPUTE_GAME.git"

echo "=========================================="
echo "  TERRA COMPUTE - GitHub Upload Helper"
echo "=========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: git is not installed. Please install git first."
    exit 1
fi

# Check if GitHub token is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo "To upload to GitHub, you need a Personal Access Token (PAT)."
    echo ""
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select the 'repo' scope"
    echo "4. Generate and copy the token"
    echo ""
    echo "Then run this script again with:"
    echo "   GITHUB_TOKEN=your_token_here ./push-to-github.sh"
    echo ""
    exit 1
fi

echo "Step 1: Configuring git remote with token..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_TOKEN}@github.com/Agnuxo1/TERRA_COMPUTE_GAME.git"

echo "Step 2: Setting branch name..."
git branch -M main

echo "Step 3: Pushing to GitHub (this may take a few minutes)..."
echo "    Uploading 75 videos + 79 images + source code..."
echo ""

if git push -u origin main --force; then
    echo ""
    echo "SUCCESS! Your game is now live at:"
    echo "    $REPO_URL"
    echo ""
    echo "Next steps:"
    echo "    - Enable GitHub Pages in Settings > Pages"
    echo "    - Set source to 'main' branch"
    echo "    - Your game will be playable at:"
    echo "      https://agnuxo1.github.io/TERRA_COMPUTE_GAME/"
else
    echo ""
    echo "ERROR: Push failed. Common causes:"
    echo "    - Invalid GitHub token"
    echo "    - Repository doesn't exist yet"
    echo "    - Network issues"
    echo ""
    echo "Make sure the repository exists at:"
    echo "    $REPO_URL"
fi
