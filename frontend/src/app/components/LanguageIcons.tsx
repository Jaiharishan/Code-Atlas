"use client";

export interface LanguageIconProps {
  language?: string;
  fileName?: string;
  className?: string;
}

// VSCode-inspired language icon mapping
const LANGUAGE_ICONS: Record<string, { icon: string; color: string }> = {
  // Programming Languages
  javascript: { icon: "JS", color: "#f7df1e" },
  typescript: { icon: "TS", color: "#3178c6" },
  tsx: { icon: "TSX", color: "#3178c6" },
  jsx: { icon: "JSX", color: "#61dafb" },
  python: { icon: "PY", color: "#3776ab" },
  java: { icon: "JAVA", color: "#ed8b00" },
  go: { icon: "GO", color: "#00add8" },
  rust: { icon: "RS", color: "#ce422b" },
  cpp: { icon: "C++", color: "#00599c" },
  c: { icon: "C", color: "#555555" },
  "c-header": { icon: "H", color: "#555555" },
  csharp: { icon: "C#", color: "#239120" },
  php: { icon: "PHP", color: "#777bb4" },
  ruby: { icon: "RB", color: "#cc342d" },
  swift: { icon: "SWIFT", color: "#fa7343" },
  kotlin: { icon: "KT", color: "#7f52ff" },
  scala: { icon: "SCALA", color: "#dc322f" },
  
  // Web Technologies
  html: { icon: "HTML", color: "#e34f26" },
  css: { icon: "CSS", color: "#1572b6" },
  scss: { icon: "SCSS", color: "#cf649a" },
  sass: { icon: "SASS", color: "#cf649a" },
  less: { icon: "LESS", color: "#1d365d" },
  
  // Data & Config
  json: { icon: "JSON", color: "#cbcb41" },
  xml: { icon: "XML", color: "#005faf" },
  yaml: { icon: "YAML", color: "#cb171e" },
  yml: { icon: "YML", color: "#cb171e" },
  toml: { icon: "TOML", color: "#9c4221" },
  ini: { icon: "INI", color: "#6d6d6d" },
  
  // Shell & Scripts
  bash: { icon: "SH", color: "#89e051" },
  shell: { icon: "SH", color: "#89e051" },
  sh: { icon: "SH", color: "#89e051" },
  zsh: { icon: "ZSH", color: "#89e051" },
  powershell: { icon: "PS1", color: "#5391fe" },
  
  // Database
  sql: { icon: "SQL", color: "#e38c00" },
  
  // Documentation
  markdown: { icon: "MD", color: "#083fa1" },
  md: { icon: "MD", color: "#083fa1" },
  rst: { icon: "RST", color: "#3674a5" },
  
  // Other
  dockerfile: { icon: "🐳", color: "#2496ed" },
  makefile: { icon: "MAKE", color: "#427819" },
  cmake: { icon: "CMAKE", color: "#064f8c" },
  gradle: { icon: "GRADLE", color: "#02303a" },
  
  // Default
  text: { icon: "TXT", color: "#6d6d6d" },
  unknown: { icon: "📄", color: "#6d6d6d" },
};

// File extension to language mapping
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".py": "python",
  ".pyx": "python",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".cc": "cpp",
  ".c": "c",
  ".h": "c-header",
  ".hpp": "c-header",
  ".cs": "csharp",
  ".php": "php",
  ".rb": "ruby",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".json": "json",
  ".xml": "xml",
  ".yaml": "yaml",
  ".yml": "yml",
  ".toml": "toml",
  ".ini": "ini",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".ps1": "powershell",
  ".sql": "sql",
  ".md": "markdown",
  ".markdown": "markdown",
  ".rst": "rst",
  ".txt": "text",
};

// Special file name mappings
const FILENAME_TO_LANGUAGE: Record<string, string> = {
  "dockerfile": "dockerfile",
  "docker-compose.yml": "dockerfile",
  "docker-compose.yaml": "dockerfile",
  "makefile": "makefile",
  "cmake": "cmake",
  "cmakelists.txt": "cmake",
  "build.gradle": "gradle",
  "gradle.build": "gradle",
  ".gitignore": "text",
  ".env": "text",
  ".env.example": "text",
  "readme.md": "markdown",
  "changelog.md": "markdown",
  "license": "text",
  "package.json": "json",
  "tsconfig.json": "json",
  "webpack.config.js": "javascript",
  "vite.config.js": "javascript",
  "next.config.js": "javascript",
};

function getLanguageFromFileName(fileName: string): string {
  const lowerFileName = fileName.toLowerCase();
  
  // Check exact filename matches first
  if (FILENAME_TO_LANGUAGE[lowerFileName]) {
    return FILENAME_TO_LANGUAGE[lowerFileName];
  }
  
  // Check extension
  const extension = "." + fileName.split(".").pop()?.toLowerCase();
  if (EXTENSION_TO_LANGUAGE[extension]) {
    return EXTENSION_TO_LANGUAGE[extension];
  }
  
  return "unknown";
}

function getLanguageIcon(language?: string, fileName?: string): { icon: string; color: string } {
  let detectedLanguage = language;
  
  if (!detectedLanguage && fileName) {
    detectedLanguage = getLanguageFromFileName(fileName);
  }
  
  if (detectedLanguage && LANGUAGE_ICONS[detectedLanguage.toLowerCase()]) {
    return LANGUAGE_ICONS[detectedLanguage.toLowerCase()];
  }
  
  return LANGUAGE_ICONS.unknown;
}

export function LanguageIcon({ language, fileName, className = "w-4 h-4" }: LanguageIconProps) {
  const { icon, color } = getLanguageIcon(language, fileName);
  
  // If it's an emoji, render as text
  if (icon.length > 2 || /[\u{1F600}-\u{1F6FF}]/u.test(icon)) {
    return (
      <span className={`${className} flex items-center justify-center text-sm`}>
        {icon}
      </span>
    );
  }
  
  // Otherwise render as a colored badge
  return (
    <span
      className={`${className} flex items-center justify-center text-xs font-bold rounded text-white`}
      style={{ backgroundColor: color }}
      title={language || fileName}
    >
      {icon}
    </span>
  );
}

export function FileIcon({ fileName, isDirectory = false, className = "w-4 h-4" }: {
  fileName: string;
  isDirectory?: boolean;
  className?: string;
}) {
  if (isDirectory) {
    return (
      <span className={`${className} flex items-center justify-center text-blue-500`}>
        📁
      </span>
    );
  }
  
  return <LanguageIcon fileName={fileName} className={className} />;
}

// Export the mapping functions for use in other components
export { getLanguageIcon, getLanguageFromFileName };