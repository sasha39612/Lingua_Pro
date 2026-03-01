# API Gateway

This service is the single entry point for all frontend requests. It handles routing to microservices, authentication verification, rate limiting, and request aggregation. The frontend should only interact with this component for a clean microservices architecture.

## Responsibilities

- **GraphQL Endpoint**: Exposes a unified GraphQL API for the frontend to query all features (listening, reading, writing, speaking, statistics, user auth).
- **Request Routing**: Routes GraphQL queries/mutations to appropriate microservices (auth-service, text-service, audio-service, stats-service, ai-orchestrator) via internal network.
- **Authentication Middleware**: Validates JWT tokens from the frontend and injects user context into all downstream requests.
- **Rate Limiting**: Prevents abuse by enforcing request limits per user/IP.
- **Request Aggregation**: Combines responses from multiple services into a single GraphQL response.
- **Health Check**: Exposes `/health` endpoint for monitoring.

## Communication

- **Frontend Access**: Only the API Gateway is exposed externally (port 8080). Frontend sends all requests here.
- **Internal Services**: All backend microservices communicate with the Gateway via Docker internal network; they are not directly exposed to the frontend.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: NestJS
- **GraphQL**: Apollo Server or similar
- **Authentication**: JWT validation middleware