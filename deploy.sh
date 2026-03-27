#!/bin/bash

# Exit on error
set -e

echo "Starting deployment process..."

# 1. Build the project
echo "Building the project..."
npm run build

# 2. Add changes to Git
echo "Adding changes to Git..."
git add .

# 3. Commit changes
echo "Committing changes..."
read -p "Enter commit message (default: 'Update'): " msg
msg=${msg:-Update}
git commit -m "$msg"

# 4. Push source code to GitHub
echo "Pushing source code to GitHub (main branch)..."
# If the remote is already added, this will push to it.
# If not, you can run: git remote add origin https://github.com/drshailesh3/Shilpahealthcare.git
git push origin main

# 5. Deploy to GitHub Pages
echo "Deploying to GitHub Pages (gh-pages branch)..."
npm run deploy

echo "Deployment complete! Your changes should be live on GitHub Pages shortly."
