# API Gateway

This service is the single entry point for all frontend requests. It handles routing to microservices, authentication verification, rate limiting, and request aggregation. The frontend should only interact with this component for a clean microservices architecture.