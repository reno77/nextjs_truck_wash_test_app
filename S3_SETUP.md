# AWS S3 Setup for Image Upload

This application uses AWS S3 for storing wash record images. Follow these steps to set up your S3 bucket:

1. Create an AWS account if you don't have one
2. Create an IAM user with the following permissions:
   - AmazonS3FullAccess
   
3. Get your AWS credentials and add them to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_region
AWS_S3_BUCKET_NAME=your_bucket_name
```

4. Run the setup script:
```bash
./scripts/setup-s3.sh
```

## Image Upload Features

- Automatic image compression before upload
- File size limit: 1MB
- Supported formats: JPEG, PNG, WebP, HEIC/HEIF
- Image dimensions automatically resized to max 1920px
- Automatic cleanup of old images (90 days)
- Organized folder structure:
  ```
  washes/
    ├── [user-id]/
    │   ├── [date]/
    │   │   ├── before/
    │   │   │   └── [image-hash].jpg
    │   │   └── after/
    │   │       └── [image-hash].jpg
    │   └── ...
    └── ...
  ```

## Security Features

- Presigned URLs for secure direct uploads
- Server-side validation of file types and sizes
- CORS configuration for allowed domains
- Automatic file expiration
- Role-based access control

## Image Cleanup

The system includes automatic cleanup features:
1. S3 Lifecycle Rules: Images older than 90 days are automatically deleted
2. Manual cleanup API: Managers can trigger cleanup of old images

To manually trigger cleanup:
```typescript
await fetch('/api/cleanup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ daysOld: 30 }),
});
```
