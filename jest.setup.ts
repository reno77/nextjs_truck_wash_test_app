/// <reference types="jest" />
import { PutObjectCommand } from '@aws-sdk/client-s3';
import '@testing-library/jest-dom';
import { NextRequest, NextResponse } from 'next/server';

// Mock environment variables for S3
process.env.AWS_S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_S3_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Define User Roles enum
export enum UserRole {
  MANAGER = 'MANAGER',
  WASHER = 'WASHER',
  DRIVER = 'DRIVER'
}

// Mock session data
const mockSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: { id: "1", name: "Test User", email: "test@example.com", role: UserRole.WASHER }
};

// Mock nextjs, next-auth, and next/server imports first

const mockResponse = {
  json: jest.fn((data, options) => ({
    status: options?.status || 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data)
  })),
  redirect: jest.fn((url) => ({
    status: 307,
    headers: new Headers({ Location: url }),
    json: () => Promise.resolve({ redirected: true })
  })),
  next: jest.fn(() => ({
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve({})
  }))
};

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: mockResponse,
  NextRequest: mockRequest,
  userAgent: jest.fn()
}));

// Set up required global variables
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    public url;
    public method;
    public headers;
    public body;

    constructor(input: string | URL, init: any = {}) {
      this.url = input instanceof URL ? input.href : input;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
    }

    json() {
      return Promise.resolve(
        typeof this.body === 'string' ? JSON.parse(this.body) : this.body
      );
    }

    text() {
      return Promise.resolve(this.body?.toString() || '');
    }

    formData() {
      return Promise.resolve(this.body);
    }
  }
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    public readonly status;
    public readonly statusText;
    public readonly headers;
    public readonly ok;
    private body;

    constructor(body?: any, init: any = {}) {
      this.status = init.status || 200;
      this.statusText = init.statusText || '';
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.body = body;
    }

    json() {
      return Promise.resolve(
        typeof this.body === 'string' ? JSON.parse(this.body) : this.body
      );
    }

    text() {
      return Promise.resolve(this.body?.toString() || '');
    }
  }
});

const mockRes = {
  json: jest.fn((data, options) => new (global as any).Response(JSON.stringify(data), {
    status: options?.status || 200,
    headers: { 'content-type': 'application/json' }
  })),
  redirect: jest.fn((url) => new (global as any).Response(null, {
    status: 307,
    headers: { Location: url }
  })),
  next: jest.fn(() => new (global as any).Response(null))
};

// Mock next/server
jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: mockRes,
  NextRequest: jest.fn().mockImplementation((url, init = {}) => {
    const reqUrl = typeof url === 'string' ? new URL(url) : url;
    const request = {
      url: reqUrl.href,
      method: init.method || 'GET',
      headers: new Headers(init.headers || {}),
      body: init.body,
      json: () => Promise.resolve(init.body ? JSON.parse(init.body) : {}),
      formData: () => Promise.resolve(init.body || new FormData()),
      nextUrl: {
        href: reqUrl.href,
        origin: reqUrl.origin,
        protocol: reqUrl.protocol,
        hostname: reqUrl.hostname,
        port: reqUrl.port,
        pathname: reqUrl.pathname,
        search: reqUrl.search,
        searchParams: reqUrl.searchParams,
        hash: reqUrl.hash,
        toString: () => reqUrl.href
      },
      cookies: { get: jest.fn(), getAll: jest.fn(), set: jest.fn(), delete: jest.fn() }
    };
    return request;
  }),
  userAgent: jest.fn()
}));

// Mock S3 Client
const mockS3Send = jest.fn().mockImplementation((command) => {
  if (!command) return Promise.resolve({ $metadata: { httpStatusCode: 200 } });

  switch (command?.constructor?.name) {
    case 'ListObjectsCommand':
    case 'ListObjectsV2Command':
      return Promise.resolve({
        Contents: [
          { Key: 'test1.jpg' },
          { Key: 'test2.jpg' }
        ],
        $metadata: { httpStatusCode: 200 }
      });
    case 'GetObjectCommand':
      return Promise.resolve({
        Body: Buffer.from('mock-image-data'),
        ContentType: 'image/jpeg',
        $metadata: { httpStatusCode: 200 }
      });
    case 'PutObjectCommand':
      return Promise.resolve({
        ETag: 'mock-etag',
        $metadata: { httpStatusCode: 200 }
      });
    case 'DeleteObjectCommand':
    case 'DeleteObjectsCommand':
      return Promise.resolve({
        $metadata: { httpStatusCode: 200 }
      });
    default:
      return Promise.resolve({
        $metadata: { httpStatusCode: 200 }
      });
  }
});

const mockS3Client = {
  send: mockS3Send
};

// Create a proper S3Client mock class
const mockS3ClientClass = jest.fn().mockImplementation(() => mockS3Client);
mockS3ClientClass.prototype.send = mockS3Send;

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: mockS3ClientClass,
  ListObjectsCommand: jest.fn(),
  ListObjectsV2Command: jest.fn(),
  GetObjectCommand: jest.fn(),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  DeleteObjectsCommand: jest.fn()
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockImplementation((client, command) => {
    const type = command?.constructor?.name || 'Command';
    const bucket = command?.input?.Bucket || command?.Bucket || 'test-bucket';
    const key = command?.input?.Key || command?.Key || 'test-key';
    return Promise.resolve(`https://mock-s3-url.com/${bucket}/${type}/${key}`);
  })
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation((str) => Promise.resolve(`hashed_${str}`)),
  compare: jest.fn().mockImplementation((str, hash) => Promise.resolve(hash === `hashed_${str}`)),
  genSalt: jest.fn().mockResolvedValue('mock-salt')
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
  }),
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' })
  })
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn((config) => () => Promise.resolve({ success: true })),
  getServerSession: jest.fn(),
  getSession: jest.fn(),
  signIn: jest.fn().mockResolvedValue({ ok: true, error: null }),
  signOut: jest.fn().mockResolvedValue(true),
  useSession: jest.fn(() => ({
    data: null,
    status: 'authenticated',
    update: jest.fn()
  }))
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(() => Promise.resolve(mockSession))
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
