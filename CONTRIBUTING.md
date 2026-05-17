# Contributing to DubTab

Thank you for your interest in contributing to DubTab! We believe in building an open and welcoming community.

## How to Contribute

1. **Bug Reports & Feature Requests**: Use the GitHub Issues tab to report bugs or suggest new features. Please use the provided issue templates.
2. **Pull Requests**: We welcome PRs! 
   - Fork the repository.
   - Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
   - Make your changes.
   - Run tests and linting (see below).
   - Commit your changes (`git commit -m 'Add amazing feature'`).
   - Push to the branch (`git push origin feature/amazing-feature`).
   - Open a Pull Request against the `main` branch.

## Development Setup

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## Code Style
- **Python**: We use `ruff` for linting and formatting.
- **TypeScript/React**: We use ESLint. Please ensure your code passes `npm run lint` before submitting a PR.

We look forward to reviewing your contributions!
