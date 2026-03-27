#!/bin/bash
echo "--- Project Status Check | प्रोजेक्ट स्टेटस चेक ---"
echo "Current Directory: $(pwd)"
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"
echo ""
echo "Checking project structure..."
if [ -f "package.json" ]; then
  echo "âœ… package.json found."
else
  echo "â Œ package.json missing!"
fi

if [ -d "src" ]; then
  echo "âœ… src directory found."
else
  echo "â Œ src directory missing!"
fi

echo ""
echo "Checking build status..."
if [ -d "dist" ]; then
  echo "âœ… dist folder exists (Build is ready)."
else
  echo "âš ï¸ dist folder not found. Run 'npm run build' to create it."
fi

echo ""
echo "--- Bash Script executed successfully! | बैश स्क्रिप्ट सफलतापूर्वक चली! ---"
