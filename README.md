# Code Atlas 🗺️

**A powerful repository analysis tool that identifies structure, languages, and generates intelligent summaries using local LLMs.**

Code Atlas provides comprehensive repository insights through an intuitive web interface, powered by Ollama for local AI analysis without sending your code to external services.

## ✨ Features

- 🔍 **Smart Repository Analysis**: Automatic language detection and file categorization
- 🌳 **Interactive Hierarchical Tree**: Collapsible directory structure with detailed file information
- 🤖 **Local AI Summaries**: Powered by Ollama - your code never leaves your machine
- 🔎 **Intelligent Search**: Search through files and summaries with highlighting
- 📊 **Dependency Graphs**: Visualize code relationships and dependencies
- 💬 **AI Q&A**: Ask questions about your codebase and get intelligent answers
- 📋 **Export Options**: Download analysis results as JSON
- 🎨 **Modern UI**: Clean, responsive interface with dark mode support

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- [Ollama](https://ollama.ai/) installed and running

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Code Atlas"
   ```

2. **Install Ollama and pull a model**
   ```bash
   # Install Ollama (if not already installed)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Pull a recommended model
   ollama pull llama3.2:3b
   
   # Start Ollama service
   ollama serve
   ```

3. **Setup Backend**
   ```bash
   # Create and activate virtual environment
   python3 -m venv .venv
   source .venv/bin/activate
   
   # Install dependencies
   pip install -r backend/requirements.txt
   
   # Configure environment (optional)
   cp backend/.env.example backend/.env
   # Edit .env to customize Ollama settings if needed
   
   # Start the backend server
   uvicorn backend.app.main:app --reload
   ```

4. **Setup Frontend**
   ```bash
   # In a new terminal
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start the development server
   npm run dev
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## 🖥️ Usage

### Web Interface

1. Open http://localhost:3000 in your browser
2. Choose your input method:
   - **Local Path**: Analyze a directory on your machine
   - **GitHub URL**: Analyze a public GitHub repository
   - **Upload ZIP**: Upload a zipped repository
3. Wait for the analysis to complete
4. Explore the results:
   - Navigate the hierarchical tree structure
   - Click files to see detailed information
   - Use the search bar to find specific files or content
   - Ask questions about your codebase
   - View dependency graphs
   - Export results as JSON

### API Usage

**Start Analysis**
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/repository"}'
```

**Check Progress**
```bash
curl http://localhost:8000/jobs/<job_id>
```

**Get Results**
```bash
curl http://localhost:8000/repos/<job_id>/tree
```

**Search Repository**
```bash
curl "http://localhost:8000/repos/<job_id>/search?q=your+query"
```

## ⚙️ Configuration

The backend can be configured via environment variables in `backend/.env`:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=60

# Alternative models you can use:
# OLLAMA_MODEL=gemma3:1b    # Smaller, faster
# OLLAMA_MODEL=llama3.1:8b  # Larger, more capable
```

## 🏗️ Architecture

### Backend (FastAPI)
- **FastAPI** - Modern Python web framework
- **Ollama Integration** - Local LLM processing
- **Batch Processing** - Efficient analysis of multiple files
- **Background Jobs** - Async repository processing
- **RESTful API** - Clean, documented endpoints

### Frontend (Next.js)
- **Next.js 15** - React framework with App Router
- **Turbopack** - Fast development and builds
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety and better DX
- **Responsive Design** - Works on desktop and mobile

### Key Components
- **Repository Walker** - Intelligent file system traversal
- **Language Detection** - Automatic programming language identification
- **LLM Service** - Local AI analysis via Ollama
- **Tree Explorer** - Interactive directory navigation
- **Search Engine** - Fast content and metadata search

## 🔧 Development

### Backend Development
```bash
# Run with auto-reload
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests (when available)
# pytest backend/tests/
```

### Frontend Development
```bash
# Development server with Turbopack
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Roadmap

- [x] **MVP**: Local file analysis with naive summaries
- [x] **LLM Integration**: Ollama-powered intelligent summaries
- [x] **Enhanced UI**: Hierarchical tree view with rich information
- [x] **Batch Processing**: Optimized LLM calls to reduce API requests
- [ ] **GitHub Integration**: Direct repository URL analysis
- [ ] **Dependency Graphs**: Visual code relationship mapping
- [ ] **Advanced Search**: Semantic search with embeddings
- [ ] **Code Insights**: Architecture analysis and recommendations
- [ ] **Team Features**: Shared analysis and collaboration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) for making local LLMs accessible
- [FastAPI](https://fastapi.tiangolo.com/) for the excellent Python web framework
- [Next.js](https://nextjs.org/) for the powerful React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

