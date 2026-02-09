import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Script, Scene } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const STYLE_PROMPT = `
Style: Modern educational illustration, clean vector art style,
vibrant but professional color palette (blues, teals, warm accents),
smooth gradients, minimal shadows, suitable for educational content,
16:9 aspect ratio, high quality, professional animation style.
Do not include text in the image.
`;

export const generateScript = async (topic: string): Promise<Script> => {
  const prompt = `You are an expert educational content creator. Create a script for a short animated educational slideshow about: ${topic}

The script should:
1. Be engaging and easy to understand.
2. Break down complex concepts into simple visuals.
3. Have clear scene-by-scene descriptions.

Return your response as valid JSON with this structure:
{
    "title": "Slideshow title",
    "scenes": [
        {
            "scene_number": 1,
            "narration": "What the narrator says (2-3 sentences max)",
            "visual_description": "Detailed description of the image to show"
        }
    ]
}

Create 4-5 scenes that tell a complete educational story about ${topic}.
Keep narration concise - each scene should be speakable in 10-15 seconds.
Make visual descriptions detailed enough for an AI image generator.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scene_number: { type: Type.INTEGER },
                  narration: { type: Type.STRING },
                  visual_description: { type: Type.STRING },
                },
                required: ['scene_number', 'narration', 'visual_description']
              }
            }
          },
          required: ['title', 'scenes']
        }
      }
    });

    const scriptText = response.text;
    if (!scriptText) throw new Error("No script generated");
    
    return JSON.parse(scriptText) as Script;
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

export const generateBranchScript = async (context: string, question: string): Promise<Script> => {
    const prompt = `The user has a question about a specific part of an educational slideshow.
    Context (Current Slide Narration): "${context}"
    User Question: "${question}"
    
    Create a very short "detour" script (1 or 2 scenes MAX) that visually explains the answer to this question.
    
    Return your response as valid JSON with this structure:
    {
        "title": "Explanation",
        "scenes": [
            {
                "scene_number": 1,
                "narration": "What the narrator says to explain the answer",
                "visual_description": "Detailed description of a visual that helps explain the answer"
            }
        ]
    }
    
    Keep it very brief and focused solely on answering the question visually.`;
  
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    scene_number: { type: Type.INTEGER },
                    narration: { type: Type.STRING },
                    visual_description: { type: Type.STRING },
                  },
                  required: ['scene_number', 'narration', 'visual_description']
                }
              }
            },
            required: ['title', 'scenes']
          }
        }
      });
  
      const scriptText = response.text;
      if (!scriptText) throw new Error("No branch script generated");
      
      return JSON.parse(scriptText) as Script;
    } catch (error) {
      console.error("Error generating branch script:", error);
      throw error;
    }
  };

export const askQuestion = async (topic: string, context: string, question: string): Promise<string> => {
    const prompt = `You are a strict educational assistant for a lesson about "${topic}".
    
    Current Slide Context: "${context}"
    User Question: "${question}"
    
    Instructions:
    1. STRICTLY evaluate if the User Question is relevant to the topic "${topic}" or the current slide context.
    2. If the question is irrelevant (e.g., asking about sports, weather, or personal opinions unrelated to "${topic}"), reply with this exact formal phrase: "I apologize, but this question is not relevant to the current educational topic. Please ask a question related to the lesson."
    3. If the question IS relevant, answer it concisely in 2-3 sentences.
    4. Do not offer to generate images, just answer in text.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "I couldn't generate an answer.";
    } catch (e) {
        console.error(e);
        return "Sorry, I had trouble connecting to the AI.";
    }
}

export const generateImage = async (visualDescription: string): Promise<string | null> => {
  const prompt = `${visualDescription}\n\n${STYLE_PROMPT}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        // responseModalities is not strictly needed for image output as the model defaults to it based on prompt, 
        // but ensuring we handle the response correctly is key.
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const generateAudio = async (text: string, voiceName: string): Promise<string | null> => {
  const prompt = `Say in an enthusiastic, educational tone: ${text}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: prompt,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
        }
    }
    return null;

  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};