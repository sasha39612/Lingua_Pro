# Frontend

User interface for students and admins. Communicates exclusively with the API Gateway. Handles recording, playback, forms for reading/writing, and displays statistics and AI feedback.

## Technology Stack

- **Framework**: Next.js 15+ (latest stable, React 18+)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS or similar CSS framework
- **API Client**: Apollo Client for GraphQL queries/mutations
- **State Management**: React Context API or Zustand
- **Recording**: Web Audio API for microphone capture
- **Form Validation**: React Hook Form + Zod

## Key Features

- **GraphQL Integration**: Communicates solely with API Gateway (port 8080)
- **Responsive Design**: Mobile-first UI for students
- **Audio Recording**: Record and playback student responses
- **Real-time Feedback**: Stream AI corrections and suggestions
- **Statistics Visualization**: Charts and progress metrics
- **Multi-language Support**: Dropdown for English, German, Albanian, Polish
- **Health Endpoint**: Exposes `/health` for monitoring

## Communication

- **API Gateway**: Connects to `http://api-gateway:8080` via internal Docker network
- **Frontend Port**: 3000 (exposed to external users)
- **Network**: `lingua-network` Docker bridge