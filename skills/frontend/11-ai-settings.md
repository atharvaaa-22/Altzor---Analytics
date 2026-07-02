# Frontend Specification: AI Engine Settings

## 1. Purpose
Allows administrators to tune the Google Gemini NL2SQL engine. This includes selecting models, adjusting temperature, configuring system prompts, and defining the caching strategy.

## 2. Goals
- Provide sliders and dropdowns for intuitive AI configuration.
- Real-time token usage preview.
- Safe testing environment to validate system prompts before pushing them to users.

## 3. Architecture

### 3.1 Folder Structure
```text
apps/web/src/
├── features/ai-config/
│   ├── components/
│   │   ├── ModelSelector.tsx
│   │   ├── PromptEditor.tsx
│   │   └── TokenUsageGraph.tsx
```

## 4. UI Specifications
- **Prompt Editor**: A large textarea with syntax highlighting for template variables (e.g., `{{SCHEMA}}`, `{{USER_QUERY}}`).
- **Sliders**: Radix UI Slider component for Temperature (`0.0` to `1.0`), colored with a gradient to indicate creativity vs. determinism.
- **Testing Console**: A split-pane view to type a mock question and see exactly what SQL Gemini outputs given the current prompt configuration.
