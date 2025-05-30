#!/bin/bash

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start the development server
cd /home/rama/Documents/code-repo/learning/testings/nextjs_truck_wash_test_app
npm run dev
