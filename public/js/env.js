/**
 * InsecureShield — Runtime Environment Variables
 * DO NOT COMMIT THIS FILE — contains production secrets
 * Loaded at runtime by the portal shell
 */

window.ENV = {
    NODE_ENV:               "production",

    // Payment processing — Stripe
    STRIPE_PUBLISHABLE_KEY: "pk_live_TYooMQauvdEDq54NiTphI7jx",
    STRIPE_SECRET_KEY:      "sk_live_51Qr7nMpKJ3eZwBYlo4D8cEf9qLtRs2vNk6uPjH",

    // Email delivery — SendGrid
    SENDGRID_API_KEY:       "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",
    SENDGRID_FROM:          "noreply@acme-portal.com",

    // Document storage — AWS S3 (via SDK)
    AWS_REGION:             "us-east-1",
    AWS_ACCESS_KEY_ID:      "AKIAR4NXBZP7KMGVQJLT",
    AWS_SECRET_ACCESS_KEY:  "9drTg7KbLnWmXvQpFhY3cZeR4sBj6kNuV2wTa8E",
    S3_BUCKET:              "acme-portal-prod-documents",

    // Twilio SMS alerts
    TWILIO_ACCOUNT_SID:     "AC4f2a8b1c9d3e7f0a5b2c6d4e8f1a3b7c",
    TWILIO_AUTH_TOKEN:      "b4f8e2a7c9d3f6a1b5c8e2d4f7a9b3c6",
    TWILIO_FROM_NUMBER:     "+15005550006",

    // Internal API keys
    INTERNAL_API_KEY:       "svc_4f7a9d2b8e3c41f7b6a5c0d2e9f3a8b4",
    WEBHOOK_SECRET:         "whsec_pQ9rT5vX1yA4bD7fH0jL6oW3nK8mBcZ2eFwsrpqt"
};
