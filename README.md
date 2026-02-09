# EduVid AI

**EduVid AI** is an interactive, AI-powered educational storytelling platform. It transforms any topic into a narrated, visual slideshow in seconds, allowing users to learn complex concepts through engaging audio-visual narratives.

Beyond simple generation, EduVid AI offers an interactive **"Ask & Visualize"** feature, allowing users to ask questions about specific scenes and generate new, visual explanations on the fly.

## 🚀 Features

*   **Instant Script Generation**: Converts a simple topic string into a structured educational script with scenes, narration, and visual descriptions.
*   **AI Image Generation**: Creates unique, consistent, vector-style educational illustrations for every scene.
*   **AI Narration (TTS)**: Uses advanced Text-to-Speech models to narrate the script with selectable voices (Puck, Charon, Kore, etc.).
*   **Interactive Chat**: Users can pause the presentation and ask specific questions about the current slide.
*   **Visual Branching**: If a user needs more clarity, the AI can generate a "Visualization Branch"—a mini-slideshow that overlays the main lesson to visually explain the answer, then returns the user to the main path.
*   **Raw Audio Processing**: Custom implementation to decode raw PCM audio streams from Gemini TTS into playable WAV blobs in the browser.

## 🛠️ Technology Stack & Models

This project is built using **React**, **TypeScript**, and **Tailwind CSS**, powered entirely by the **Google Gemini API**.

### AI Models Used

| Feature | Model | Purpose |
| :--- | :--- | :--- |
| **Orchestration & Logic** | `gemini-3-flash-preview` | Generates the educational script, handles Q&A context, and creates visual descriptions for the image generator. |
| **Image Generation** | `gemini-2.5-flash-image` | Generates high-quality, 16:9 educational vector illustrations based on the script's visual descriptions. |
| **Text-to-Speech** | `gemini-2.5-flash-preview-tts` | Generates high-fidelity spoken audio. We handle the raw PCM byte stream manually to create gapless playback in the browser. |

## 🔮 Future Roadmap: Veo 3 Integration (Paid Tier)

Currently, EduVid AI operates on the Free Tier, using static images with smooth CSS transitions. With access to a Paid API Key and **Veo 3** (Google's generative video model), we can revolutionize this application:

### **From Slideshow to Dynamic Video**
Instead of static transitions between slides, we can use **Veo 3** to generate video segments.

1.  **Character Animation**: We can take the generated image of a scene and use Veo to animate the characters and environment for the duration of the narration (10-15s), bringing the lesson to life.
2.  **Start-to-End Frame Interpolation**: We can use Veo's ability to accept a `starting_image` and `ending_image`. By feeding Scene 1's image as the start and Scene 2's image as the end, Veo can generate a morphing video transition that visually connects the concepts, making the educational journey seamless.
3.  **Real-time Physics**: Complex concepts (like "Gravity" or "Fluid Dynamics") could be rendered as actual video simulations rather than static diagrams.

**Goal**: Transform EduVid AI from a "Narrated PowerPoint" into a "Generative Educational Movie Platform."

## 📦 Architecture Highlights

*   **`services/geminiService.ts`**: Centralized API handling. Includes specific prompts to enforce JSON structure for scripts and "Visualization Branches."
*   **`utils/audioUtils.ts`**: Contains the logic to wrap raw PCM audio data with RIFF headers to create valid WAV files for HTML5 Audio elements.
*   **`components/Slideshow.tsx`**: Handles the complex state of the main slideshow vs. the overlay "Branch" slideshow, as well as the chat interface and audio synchronization.
