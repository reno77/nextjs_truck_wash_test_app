#!/bin/bash

# Check if AWS CLI is installed
# if ! command -v aws &> /dev/null; then
#     echo "AWS CLI is not installed. Please install it first."
#     exit 1
# fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo ".env file not found"
    exit 1
fi

# Create S3 bucket if it doesn't exist
aws s3api create-bucket \
    --bucket $AWS_S3_BUCKET_NAME \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION

# Set CORS configuration
aws s3api put-bucket-cors --bucket $AWS_S3_BUCKET_NAME --cors-configuration '{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["PUT", "POST", "GET"],
            "AllowedOrigins": ["http://127.0.0.1:3000", "http://localhost:3000", "https://*.your-domain.com"],
            "ExposeHeaders": ["ETag"]
        }
    ]
}'

# Set lifecycle rules for automatic cleanup
aws s3api put-bucket-lifecycle-configuration --bucket $AWS_S3_BUCKET_NAME --lifecycle-configuration '{
    "Rules": [
        {
            "ID": "AutoCleanupRule",
            "Status": "Enabled",
            "Prefix": "washes/",
            "Expiration": {
                "Days": 90
            }
        }
    ]
}'

# Configure block public access settings (keep everything blocked for security)
aws s3api put-public-access-block \
    --bucket $AWS_S3_BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "S3 bucket setup complete with secure access configuration!"
echo "Note: Access will be managed through IAM user permissions and pre-signed URLs"
