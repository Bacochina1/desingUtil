import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { AspectRatio } from '../types';
import { GENERATION_MODEL, EDIT_MODEL } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// This is a critical instruction added to prevent the model from rotating images or adding borders.
const EDIT_PROMPT_SUFFIX = " IMPORTANT: The output image MUST have the exact same dimensions as the input image. Do not rotate, crop, scale, or add any borders, letterboxing, or padding. Preserve all original content outside the explicitly edited area.";

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const response = await ai.models.generateImages({
    model: GENERATION_MODEL,
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: aspectRatio,
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  }
  throw new Error("Image generation failed or returned no images.");
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const imagePart = {
    inlineData: {
      data: base64Image.split(',')[1],
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: `${prompt}${EDIT_PROMPT_SUFFIX}`,
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: EDIT_MODEL,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("Image editing failed or returned no image data.");
};

export const createMockup = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    // This function is structurally the same as editImage but is semantically clearer for creating mockups.
    return editImage(base64Image, mimeType, prompt);
};

export const vectorizeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    const imagePart = {
        inlineData: {
            data: base64Image.split(',')[1],
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: "Analyze the provided image and convert it into a clean, simplified, and scalable SVG. The SVG should accurately represent the main shapes and colors of the original image. Only output the raw SVG code, starting with `<svg` and ending with `</svg>`. Do not include markdown code fences or any other text, explanations, or introductions in your response.",
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    const svgCode = response.text.trim();
    
    if (!svgCode.startsWith('<svg') || !svgCode.endsWith('</svg>')) {
        console.error("Generated text is not valid SVG:", svgCode);
        throw new Error("Failed to generate valid SVG code. The model response was not in the expected format.");
    }

    return svgCode;
};


export const upscaleImage = async (base64Image: string, mimeType: string): Promise<string> => {
    const prompt = "Upscale this image to 2x its resolution. Enhance details, sharpness, and clarity while maintaining photorealism. Do not add or change any content.";
    return editImage(base64Image, mimeType, prompt);
};

export const removeText = async (base64Image: string, mimeType: string): Promise<string> => {
    const prompt = "Analyze this image and remove any and all text present. The areas where the text was removed should be seamlessly and realistically filled in, matching the surrounding background and textures perfectly.";
    return editImage(base64Image, mimeType, prompt);
};

export const replaceSky = async (base64Image: string, mimeType: string, skyPrompt: string): Promise<string> => {
    const prompt = `In this image, identify the sky and replace it with: "${skyPrompt}". Ensure the new sky is blended seamlessly. Crucially, adjust the lighting, shadows, and reflections on the entire image (including foreground objects and characters) to realistically match the new sky's light source, color, and mood.`;
    return editImage(base64Image, mimeType, prompt);
};

export const generateFromDoodle = async (base64Doodle: string, mimeType: string, prompt: string): Promise<string> => {
    const doodlePart = {
        inlineData: {
            data: base64Doodle.split(',')[1],
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: `Use this simple black and white sketch as a structural and compositional guide to generate a detailed, photorealistic image based on the following prompt: "${prompt}". Adhere closely to the shapes and composition outlined in the sketch.`,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: EDIT_MODEL,
        contents: { parts: [doodlePart, textPart] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }

    throw new Error("Doodle generation failed or returned no image data.");
};


export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};